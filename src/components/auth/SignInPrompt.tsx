import { Heart, Package, ShieldCheck, Trophy, Warehouse, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';
import { GoogleSignInButton } from './GoogleSignInButton';

interface Benefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

const BENEFITS: readonly Benefit[] = [
  {
    icon: Warehouse,
    title: 'Virtual garage',
    text: 'Park every car you own and track duplicates.',
  },
  { icon: Trophy, title: 'XP & badges', text: 'Level up and unlock collector achievements.' },
  { icon: Heart, title: 'Synced wishlist', text: 'Your hit list follows you to every device.' },
  { icon: Package, title: 'Faster checkout', text: 'Saved addresses and full order history.' },
];

const DEFAULT_REASON = 'Sign in with Google to unlock your garage, wishlist and collector XP.';

/**
 * "PIT PASS REQUIRED" sign-in modal, driven by `uiStore.signInPrompt` (opened by
 * `useRequireAuthAction()` / `openSignInPrompt(reason)`). Closes after a successful sign-in —
 * AuthProvider then runs the queued action. Mounted once in `AppLayout`.
 */
export function SignInPrompt() {
  const open = useUiStore((state) => state.signInPrompt.open);
  const reason = useUiStore((state) => state.signInPrompt.reason);
  const close = useUiStore((state) => state.closeSignInPrompt);
  const { status } = useAuth();

  // Signed in elsewhere (another tab, redirect completion) while the prompt is open.
  useEffect(() => {
    if (open && status === 'signed-in') close();
  }, [open, status, close]);

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Access control · crew only
        </span>
      }
      title="Pit pass required"
      description={reason ?? DEFAULT_REASON}
      footer={
        <Button variant="ghost" onClick={close}>
          Maybe later
        </Button>
      }
    >
      {/* Short (landscape-phone) viewports: the sign-in button comes first and the perks shrink
          to title-only chips, so the action is visible without scrolling. */}
      <div className="flex flex-col">
        <ul className="grid gap-3 sm:grid-cols-2 short:order-3 short:mt-4 short:gap-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex gap-3 rounded-lg border border-line bg-card p-3 dark:bg-card-hover/40 short:items-center short:p-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface short:h-7 short:w-7">
                <Icon aria-hidden="true" className="h-4 w-4 text-accent-ink" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-xs font-semibold uppercase tracking-hud text-fg">
                  {title}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-muted short:hidden">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <GoogleSignInButton
          data-autofocus=""
          variant="primary"
          size="lg"
          fullWidth
          className="mt-6 short:order-1 short:mt-0"
          onSignedIn={close}
        />
        <p className="mt-3 text-center text-xs text-muted short:order-2 short:mt-2">
          Google sign-in only · we never post on your behalf.
        </p>
      </div>
    </Modal>
  );
}
