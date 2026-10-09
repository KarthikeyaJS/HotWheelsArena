import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Parked-car interaction phases:
 * idle → `rev` (engine shake) → `lights` (headlights on) → `expanded` (card grows).
 */
export type RevPhase = 'idle' | 'rev' | 'lights' | 'expanded';

/** Delays (ms) from engage to each phase. */
export const REV_TIMINGS = { lights: 240, expand: 520 } as const;

export interface RevSequenceOptions {
  /** Allow the final `expanded` phase (desktop row layout without reduced motion). */
  expand: boolean;
  /** Reduced motion: skip the shake and expansion — jump straight to the lights (colour change). */
  reducedMotion: boolean;
}

export interface RevSequence {
  activeId: string | null;
  phaseOf: (id: string) => RevPhase;
  /** Pointer enter / focus. */
  engage: (id: string) => void;
  /** Pointer leave / blur. */
  release: (id: string) => void;
}

interface RevState {
  id: string | null;
  phase: RevPhase;
}

const IDLE: RevState = { id: null, phase: 'idle' };

/**
 * One active card at a time; timers are cleared on every transition and on unmount, so fast
 * sweeps across the row never leave a stale card expanded.
 */
export function useRevSequence({ expand, reducedMotion }: RevSequenceOptions): RevSequence {
  const [state, setState] = useState<RevState>(IDLE);
  const stateRef = useRef<RevState>(IDLE);
  const timers = useRef<number[]>([]);

  const commit = useCallback((next: RevState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const engage = useCallback(
    (id: string) => {
      const current = stateRef.current;
      if (current.id === id && current.phase !== 'idle') return;
      clearTimers();
      if (reducedMotion) {
        commit({ id, phase: 'lights' });
        return;
      }
      commit({ id, phase: 'rev' });
      timers.current.push(
        window.setTimeout(() => {
          if (stateRef.current.id === id) commit({ id, phase: 'lights' });
        }, REV_TIMINGS.lights),
      );
      if (expand) {
        timers.current.push(
          window.setTimeout(() => {
            if (stateRef.current.id === id) commit({ id, phase: 'expanded' });
          }, REV_TIMINGS.expand),
        );
      }
    },
    [clearTimers, commit, expand, reducedMotion],
  );

  const release = useCallback(
    (id: string) => {
      if (stateRef.current.id !== id) return;
      clearTimers();
      commit(IDLE);
    },
    [clearTimers, commit],
  );

  // Layout/motion preference changed mid-interaction: settle the active card.
  useEffect(() => {
    const current = stateRef.current;
    if (!expand && current.phase === 'expanded' && current.id) {
      commit({ id: current.id, phase: 'lights' });
    }
  }, [expand, commit]);

  const phaseOf = useCallback(
    (id: string): RevPhase => (state.id === id ? state.phase : 'idle'),
    [state],
  );

  return { activeId: state.id, phaseOf, engage, release };
}
