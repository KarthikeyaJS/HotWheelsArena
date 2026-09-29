import { useCallback } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { getCurrentUid } from '@/services/auth';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';

type AuthAction = () => void | Promise<void>;

/**
 * The action queued while the SignInPrompt is open. AuthProvider runs it right after a
 * successful sign-in and clears it when the prompt is dismissed.
 */
let pendingAction: AuthAction | null = null;

function runSafely(action: AuthAction): void {
  try {
    void Promise.resolve(action()).catch((error: unknown) => {
      toast.error("Couldn't finish that", getFriendlyErrorMessage(error));
    });
  } catch (error) {
    toast.error("Couldn't finish that", getFriendlyErrorMessage(error));
  }
}

/** Runs and clears the queued action (called by AuthProvider after sign-in). */
export function runPendingAuthAction(): boolean {
  const action = pendingAction;
  pendingAction = null;
  if (!action) return false;
  runSafely(action);
  return true;
}

/** Drops the queued action (called when the prompt is dismissed without signing in). */
export function clearPendingAuthAction(): void {
  pendingAction = null;
}

export type RequireAuthAction = (action: AuthAction, reason?: string) => void;

/**
 * Wraps an action that needs a signed-in collector.
 * Signed in → runs immediately. Signed out → opens the SignInPrompt with `reason` and runs the
 * action automatically after a successful sign-in. Actions should read the uid at call time
 * (`getCurrentUid()` / `requireUid()`), not from a render-time closure.
 *
 * @example
 * const requireAuth = useRequireAuthAction();
 * <button onClick={() => requireAuth(() => navigate('/garage'), 'Sign in to open your garage')} />
 */
export function useRequireAuthAction(): RequireAuthAction {
  const openSignInPrompt = useUiStore((state) => state.openSignInPrompt);

  return useCallback(
    (action, reason) => {
      if (getCurrentUid()) {
        runSafely(action);
        return;
      }
      pendingAction = action;
      openSignInPrompt(reason ?? 'Sign in with Google to continue.');
    },
    [openSignInPrompt],
  );
}
