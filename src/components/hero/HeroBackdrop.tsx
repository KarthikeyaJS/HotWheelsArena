import { memo } from 'react';
import { GridBackground } from '@/components/effects/GridBackground';
import { ParticleField } from '@/components/effects/ParticleField';
import { RacingLines } from '@/components/effects/RacingLines';
import { SpeedLines } from '@/components/effects/SpeedLines';
import { TireMarks } from '@/components/effects/TireMarks';
import { cn } from '@/lib/cn';

export interface HeroBackdropProps {
  /** Scroll sequence active: renders the extra "rush" speed-line layer GSAP fades in. */
  sequence: boolean;
  className?: string;
}

/** Pillar positions across the (wider-than-viewport) mid parallax layer. */
const PILLARS = [
  { left: '4%', bay: '05' },
  { left: '27%', bay: '06' },
  { left: '50%', bay: '07' },
  { left: '73%', bay: '08' },
  { left: '96%', bay: '09' },
] as const;

const CEILING_LIGHTS = ['6%', '24%', '42%', '60%', '78%'] as const;

/**
 * The garage scene behind the hero car. Dark theme: an underground garage at night (fluorescent
 * tubes, concrete pillars, glowing floor grid, skid marks, dust). Light theme: a bright showroom
 * (softbox ceiling panels, pale wall seams, glossy floor). Each depth plane is tagged with
 * `data-hero-layer` (`far`, `mid`, `floor`, `racing`, `speed-base`, `speed-rush`) so the scroll
 * sequence can parallax it the opposite way to the car. Decorative and pointer-transparent.
 */
export const HeroBackdrop = memo(function HeroBackdrop({ sequence, className }: HeroBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      {/* Atmosphere: overhead light pool + floor bounce. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgb(var(--surface))_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgb(var(--text)/0.07)_0%,transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_55%_45%_at_50%_78%,rgb(var(--surface)/0.95)_0%,transparent_75%)] dark:bg-[radial-gradient(ellipse_50%_40%_at_50%_80%,rgb(var(--text)/0.06)_0%,transparent_75%)]" />

      {/* FAR plane — back wall, level markings and ceiling lights. */}
      <div data-hero-layer="far" className="absolute inset-y-0 left-0 w-[130%]">
        <div className="absolute inset-x-0 top-0 h-[62%] bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%-1px),rgb(var(--border)/0.55)_calc(10%-1px),rgb(var(--border)/0.55)_10%)] [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000)] dark:bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%-1px),rgb(var(--border)/0.45)_calc(10%-1px),rgb(var(--border)/0.45)_10%)]" />
        <span className="absolute left-[9%] top-[16%] font-display text-[clamp(5rem,12vw,10rem)] font-black leading-none text-fg/[0.03]">
          B2
        </span>
        <span className="absolute left-[70%] top-[55%] font-mono text-[10px] uppercase tracking-hud text-fg/20">
          Level B2 · Collector parking only
        </span>
        <div className="absolute inset-x-0 top-[62%] h-px bg-line" />
        {CEILING_LIGHTS.map((left) => (
          <span
            key={left}
            className="absolute top-[5%] h-2.5 w-[10%] rounded-sm border border-line bg-surface shadow-card dark:top-[6%] dark:h-1 dark:w-[8%] dark:rounded-full dark:border-0 dark:bg-fg/80 dark:shadow-[0_0_26px_6px_rgb(var(--text)/0.16)]"
            style={{ left }}
          />
        ))}
      </div>

      {/* MID plane — structural pillars with bay numbers. */}
      <div data-hero-layer="mid" className="absolute inset-y-0 left-0 w-[160%]">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.bay}
            className="absolute top-0 h-[63%] w-10 border-x border-line bg-gradient-to-r from-surface via-card-hover to-surface dark:from-card dark:via-card-hover dark:to-surface lg:w-14"
            style={{ left: pillar.left }}
          >
            <span className="bg-checker absolute inset-x-0 bottom-0 h-5 opacity-[0.08] dark:opacity-[0.12]" />
            <span className="absolute inset-x-0 bottom-8 text-center font-mono text-[10px] font-semibold tracking-hud text-fg/30">
              {pillar.bay}
            </span>
          </div>
        ))}
      </div>

      {/* FLOOR plane — perspective grid, glow and skid marks. */}
      <div data-hero-layer="floor" className="absolute inset-y-0 -left-[20%] w-[200%]">
        <GridBackground perspective glow />
        <TireMarks
          variant="curve"
          className="bottom-0 top-auto h-1/2 text-fg/[0.03] dark:text-fg/[0.04]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-card-hover/70 dark:to-bg/60" />

      {/* Light and speed. */}
      <div data-hero-layer="racing" className="absolute inset-0 opacity-70">
        <RacingLines count={4} angle={-4} />
      </div>
      <ParticleField density={2.2} maxParticles={40} className="opacity-60 dark:opacity-100" />
      <div data-hero-layer="speed-base" className="absolute inset-0 opacity-60">
        <SpeedLines intensity="low" band={[42, 90]} />
      </div>
      {sequence ? (
        <div data-hero-layer="speed-rush" className="absolute inset-0 opacity-0">
          <SpeedLines intensity="high" band={[30, 94]} seed={11} />
        </div>
      ) : null}

      {/* Edge vignette (night garage only). */}
      <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(var(--bg)/0.85)_100%)] dark:block" />
    </div>
  );
});
