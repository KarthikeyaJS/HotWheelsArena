import { Volume2, VolumeX } from 'lucide-react';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { playSound } from '@/hooks/useSound';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';
import { ToggleRow } from './ToggleRow';

export interface SoundToggleProps {
  /** `icon` (navbar), `row` (drawer settings), `text` (compact footer chip). */
  variant?: 'icon' | 'row' | 'text';
  size?: IconButtonSize;
  className?: string;
}

/**
 * Optional engine sounds on/off (off by default, persisted). A toggle button (`aria-pressed`)
 * with a constant name; turning sounds on plays a short "start" cue as confirmation.
 */
export function SoundToggle({ variant = 'icon', size = 'md', className }: SoundToggleProps) {
  const enabled = useUiStore((state) => state.soundEnabled);
  const toggleSound = useUiStore((state) => state.toggleSound);

  const toggle = (): void => {
    const turningOn = !useUiStore.getState().soundEnabled;
    toggleSound();
    if (turningOn) playSound('start');
  };

  if (variant === 'row') {
    return (
      <ToggleRow
        icon={enabled ? Volume2 : VolumeX}
        label="Engine sounds"
        value={enabled ? 'ON' : 'OFF'}
        kind="switch"
        checked={enabled}
        onClick={toggle}
        className={className}
      />
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        className={cn(
          'hud inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[10px] transition-colors',
          enabled
            ? 'border-accent/50 bg-accent/10 text-accent-ink'
            : 'border-line text-muted hover:border-accent/60 hover:text-fg',
          className,
        )}
      >
        {enabled ? (
          <Volume2 aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <VolumeX aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        <span>
          Sound <span aria-hidden="true">· {enabled ? 'On' : 'Off'}</span>
        </span>
      </button>
    );
  }

  return (
    <IconButton
      label="Engine sounds"
      title={enabled ? 'Engine sounds: on' : 'Engine sounds: off'}
      size={size}
      pressed={enabled}
      onClick={toggle}
      className={className}
      icon={enabled ? <Volume2 /> : <VolumeX />}
    />
  );
}
