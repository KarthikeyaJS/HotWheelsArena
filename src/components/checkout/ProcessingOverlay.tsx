import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Tachometer } from '@/components/effects/Tachometer';
import { Portal } from '@/components/ui/Portal';
import { useOverlayBehavior } from '@/components/ui/useOverlayBehavior';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatINR } from '@/lib/format';
import type { PaymentMethod } from '@/types';
import { paymentMethodLabel } from './paymentMethods';

export type ProcessingPhase = 'paying' | 'confirming' | 'done';

export interface ProcessingOverlayProps {
  /** `null` hides the overlay. */
  phase: ProcessingPhase | null;
  method: PaymentMethod | null;
  amount: number;
}

const COPY: Readonly<Record<ProcessingPhase, { title: string; detail: string; step: string }>> = {
  paying: {
    title: 'Warming up the engine…',
    detail: 'Contacting the test bank',
    step: 'STEP 1/2 · PAYMENT',
  },
  confirming: {
    title: 'Locking in your order…',
    detail: 'Parking your cars in the garage and tallying XP',
    step: 'STEP 2/2 · CONFIRMATION',
  },
  done: {
    title: 'Chequered flag!',
    detail: 'Order confirmed — rolling to the finish line',
    step: 'COMPLETE',
  },
};

const TARGET_RPM: Readonly<Record<ProcessingPhase, number>> = {
  paying: 6400,
  confirming: 8300,
  done: 9400,
};

function OverlayPanel({
  phase,
  method,
  amount,
}: Required<{ phase: ProcessingPhase }> & Omit<ProcessingOverlayProps, 'phase'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const [wobble, setWobble] = useState(0);

  useOverlayBehavior(panelRef, {
    onClose: () => undefined,
    closeOnEsc: false,
    initialFocusRef: headingRef,
    returnFocus: true,
  });

  // A little idle "blip" of the needle so the tach feels alive while we wait.
  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => setWobble((value) => (value > 0 ? -1 : 1)), 700);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const copy = COPY[phase];
  const rpm = TARGET_RPM[phase] + (reduceMotion ? 0 : wobble * 220);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-title"
      aria-describedby="processing-detail"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-modal grid place-items-center bg-bg/85 px-4 backdrop-blur-md focus:outline-none"
    >
      <div
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="relative flex w-full max-w-md flex-col items-center gap-5 overflow-hidden rounded-2xl border border-line bg-surface/90 px-6 py-8 text-center shadow-card-hover sm:px-10">
        <span aria-hidden="true" className="racing-stripe is-active" />
        <p className="hud text-muted">{copy.step}</p>
        <Tachometer rpm={rpm} size="md" animate={!reduceMotion} />
        <h2
          id="processing-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl text-fg focus:outline-none sm:text-2xl"
        >
          {copy.title}
        </h2>
        <p id="processing-detail" aria-live="polite" className="text-sm text-muted">
          {copy.detail}
          {method && phase === 'paying' ? ` · ${paymentMethodLabel(method)}` : ''}
          {' · '}
          <span className="font-mono text-fg">{formatINR(amount)}</span>
        </p>
        <div
          aria-hidden="true"
          className="relative h-1 w-full overflow-hidden rounded-full bg-line"
        >
          <span
            className={
              reduceMotion
                ? 'absolute inset-y-0 left-0 w-2/3 bg-accent'
                : 'absolute inset-0 animate-speed-line bg-[linear-gradient(90deg,transparent,rgb(var(--accent))_45%,rgb(var(--accent))_55%,transparent)]'
            }
          />
        </div>
        <p className="hud text-xs text-muted">
          TEST MODE · NO REAL PAYMENT · PLEASE KEEP THIS TAB OPEN
        </p>
      </div>
    </motion.div>
  );
}

/** Full-screen, focus-trapped "WARMING UP THE ENGINE…" overlay while the order is placed. */
export function ProcessingOverlay({ phase, method, amount }: ProcessingOverlayProps) {
  return (
    <Portal>
      <AnimatePresence>
        {phase ? (
          <OverlayPanel key="processing" phase={phase} method={method} amount={amount} />
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
