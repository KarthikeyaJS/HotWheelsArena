import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';

export interface ParticleFieldProps {
  /** Particles per 100,000 CSS px² of the parent (default 3.5). */
  density?: number;
  /** Hard cap on the particle count (default 48). */
  maxParticles?: number;
  /** Share of orange (glowing) particles, 0–1 (default 0.22). */
  accentRatio?: number;
  /** Speed multiplier (default 1). */
  speed?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
  twinkle: number;
  accent: boolean;
}

interface Palette {
  base: string;
  accent: string;
}

const MAX_DPR = 2;

/** Reads an RGB-triplet token (`--accent: 255 90 0`) into a `r, g, b` string. */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  return parts.length >= 3 ? parts.slice(0, 3).join(', ') : fallback;
}

function readPalette(): Palette {
  return {
    base: readToken('--text', '255, 255, 255'),
    accent: readToken('--accent', '255, 90, 0'),
  };
}

function createParticle(
  width: number,
  height: number,
  accentRatio: number,
  anywhere: boolean,
): Particle {
  const accent = Math.random() < accentRatio;
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + Math.random() * 20,
    radius: accent ? 0.9 + Math.random() * 1.3 : 0.5 + Math.random() * 1.1,
    vx: (Math.random() - 0.5) * 8,
    vy: -(8 + Math.random() * 22),
    alpha: accent ? 0.45 + Math.random() * 0.4 : 0.12 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.6 + Math.random() * 1.6,
    accent,
  };
}

/**
 * Floating dust / spark particles on a `<canvas>` that fills its positioned parent.
 * - devicePixelRatio aware (capped at 2), resizes with the parent (ResizeObserver);
 * - pauses when scrolled off-screen (IntersectionObserver) and when the tab is hidden;
 * - renders nothing for reduced-motion users; low particle counts by default;
 * - colours follow the theme tokens (`--text`, `--accent`).
 * Decorative (`aria-hidden`) and pointer-transparent.
 */
export function ParticleField({
  density = 3.5,
  maxParticles = 48,
  accentRatio = 0.22,
  speed = 1,
  className,
}: ParticleFieldProps) {
  const reduceMotion = useReducedMotion();
  const theme = useUiStore((state) => state.theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette | null>(null);

  // Re-read colours after a theme switch (ThemeSync updates <html> in an effect → next frame).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      paletteRef.current = readPalette();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [theme]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const container = canvas?.parentElement;
    if (!canvas || !context || !container) return undefined;

    paletteRef.current ??= readPalette();
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let inView = true;
    let pageVisible = document.visibilityState !== 'hidden';

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(
        Math.max(0, Math.floor(maxParticles)),
        Math.round(((width * height) / 100_000) * Math.max(0, density)),
      );
      if (particles.length > target) {
        particles = particles.slice(0, target);
      } else {
        while (particles.length < target) {
          particles.push(createParticle(width, height, accentRatio, true));
        }
      }
      particles.forEach((particle) => {
        if (particle.x > width) particle.x = Math.random() * width;
        if (particle.y > height + 20) particle.y = Math.random() * height;
      });
    };

    const draw = (time: number): void => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
      lastTime = time;
      const palette = paletteRef.current ?? readPalette();
      context.clearRect(0, 0, width, height);

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle) continue;
        particle.x += particle.vx * dt * speed;
        particle.y += particle.vy * dt * speed;
        particle.phase += particle.twinkle * dt;
        if (particle.y < -12 || particle.x < -12 || particle.x > width + 12) {
          particles[index] = createParticle(width, height, accentRatio, false);
          continue;
        }
        const flicker = 0.65 + 0.35 * Math.sin(particle.phase);
        const alpha = particle.alpha * flicker;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        if (particle.accent) {
          context.shadowBlur = 8;
          context.shadowColor = `rgba(${palette.accent}, ${alpha})`;
          context.fillStyle = `rgba(${palette.accent}, ${alpha})`;
        } else {
          context.shadowBlur = 0;
          context.fillStyle = `rgba(${palette.base}, ${alpha})`;
        }
        context.fill();
      }
      context.shadowBlur = 0;
      frame = window.requestAnimationFrame(draw);
    };

    const start = (): void => {
      if (frame || !inView || !pageVisible) return;
      lastTime = 0;
      frame = window.requestAnimationFrame(draw);
    };

    const stop = (): void => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibility = (): void => {
      pageVisible = document.visibilityState !== 'hidden';
      if (pageVisible) start();
      else stop();
    };

    resize();

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
    resizeObserver?.observe(container);

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              inView = entries.some((entry) => entry.isIntersecting);
              if (inView) start();
              else stop();
            },
            { rootMargin: '64px' },
          )
        : null;
    intersectionObserver?.observe(canvas);

    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduceMotion, density, maxParticles, accentRatio, speed]);

  if (reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
