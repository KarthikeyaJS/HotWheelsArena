import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

export interface ConfettiBurstProps {
  /** Number of pieces (default 150). */
  pieces?: number;
  /** How long new frames are drawn (ms, default 3600). */
  durationMs?: number;
  className?: string;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  /** Chequered-flag squares vs. streamers. */
  kind: 'check' | 'strip';
  wobble: number;
}

const GRAVITY = 0.16;
const DRAG = 0.992;

/** Reads a `--token: r g b` custom property as an `rgb()` colour (theme-aware). */
function tokenColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `rgb(${value})` : fallback;
}

/**
 * One-shot chequered-flag confetti on a canvas (two cannons from the lower corners). Decorative,
 * pointer-transparent, stops by itself and renders nothing under reduced motion.
 */
export function ConfettiBurst({ pieces = 150, durationMs = 3600, className }: ConfettiBurstProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = [
      tokenColor('--accent', 'rgb(255 90 0)'),
      tokenColor('--accent', 'rgb(255 90 0)'),
      tokenColor('--text', 'rgb(255 255 255)'),
      tokenColor('--metal', 'rgb(184 188 194)'),
      tokenColor('--accent-2', 'rgb(225 6 0)'),
    ];
    const ink = tokenColor('--text', 'rgb(255 255 255)');
    const paper = tokenColor('--bg', 'rgb(8 8 8)');

    const confetti: Piece[] = Array.from({ length: pieces }, (_, index) => {
      const fromLeft = index % 2 === 0;
      const angle = (fromLeft ? -60 : -120) + (Math.random() - 0.5) * 40;
      const speed = 9 + Math.random() * 9;
      const radians = (angle * Math.PI) / 180;
      const kind: Piece['kind'] = Math.random() < 0.28 ? 'check' : 'strip';
      return {
        x: fromLeft ? width * 0.08 : width * 0.92,
        y: height * 0.95,
        vx: Math.cos(radians) * speed,
        vy: Math.sin(radians) * speed,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        size: kind === 'check' ? 9 + Math.random() * 5 : 5 + Math.random() * 6,
        color: palette[index % palette.length] ?? ink,
        kind,
        wobble: Math.random() * Math.PI * 2,
      };
    });

    const drawCheck = (piece: Piece): void => {
      const half = piece.size / 2;
      const cell = piece.size / 2;
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          context.fillStyle = (row + col) % 2 === 0 ? ink : paper;
          context.fillRect(-half + col * cell, -half + row * cell, cell, cell);
        }
      }
    };

    const started = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const elapsed = now - started;
      const fade = elapsed > durationMs - 700 ? Math.max(0, (durationMs - elapsed) / 700) : 1;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = fade;
      for (const piece of confetti) {
        piece.vx *= DRAG;
        piece.vy = piece.vy * DRAG + GRAVITY;
        piece.wobble += 0.12;
        piece.x += piece.vx + Math.sin(piece.wobble) * 0.6;
        piece.y += piece.vy;
        piece.rotation += piece.spin;
        if (piece.y > height + 40) continue;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        if (piece.kind === 'check') {
          drawCheck(piece);
        } else {
          context.fillStyle = piece.color;
          context.scale(1, Math.cos(piece.wobble));
          context.fillRect(-piece.size / 2, -piece.size, piece.size, piece.size * 2);
        }
        context.restore();
      }
      if (elapsed < durationMs) {
        frame = window.requestAnimationFrame(tick);
      } else {
        context.clearRect(0, 0, width, height);
        setFinished(true);
      }
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [reduceMotion, pieces, durationMs]);

  if (reduceMotion || finished) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
