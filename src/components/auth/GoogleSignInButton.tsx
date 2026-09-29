import type { User } from 'firebase/auth';
import { forwardRef, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { useAuth } from '@/hooks/useAuth';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { toast } from '@/store/toastStore';
import { GoogleMark } from './GoogleMark';

export interface GoogleSignInButtonProps extends Omit<
  ButtonProps,
  'children' | 'leftIcon' | 'loading' | 'to' | 'href' | 'type' | 'onClick'
> {
  /** Visible label (default "Sign in with Google"). "with Google" is added for screen readers when omitted. */
  label?: string;
  /**
   * Text beside the spinner while the popup is open (default "Opening Google…"; its width is
   * reserved up-front). Pass `null` for compact buttons that should keep their own width.
   */
  loadingText?: ButtonProps['loadingText'];
  /** Called with the Firebase user after a successful sign-in (not on cancel / redirect). */
  onSignedIn?: (user: User) => void;
}

/**
 * Google sign-in button (Google "G" mark + racing button styles). Shows a loading state while
 * the popup is open; failures are toasted with a friendly message (AuthProvider toasts sign-in
 * errors; anything unexpected is caught here as a safety net).
 */
export const GoogleSignInButton = forwardRef<HTMLElement, GoogleSignInButtonProps>(
  function GoogleSignInButton(
    {
      label = 'Sign in with Google',
      loadingText = 'Opening Google…',
      onSignedIn,
      variant = 'secondary',
      size = 'md',
      ...rest
    },
    ref,
  ) {
    const { signIn, isSigningIn } = useAuth();
    const [pending, setPending] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const loading = pending || isSigningIn;
    const mentionsGoogle = /google/i.test(label);

    const handleClick = async (_event: MouseEvent<HTMLElement>): Promise<void> => {
      if (loading) return;
      setPending(true);
      try {
        const user = await signIn();
        if (user) onSignedIn?.(user);
      } catch (error) {
        toast.error('Sign-in failed', getFriendlyErrorMessage(error));
      } finally {
        if (mountedRef.current) setPending(false);
      }
    };

    return (
      <Button
        {...rest}
        ref={ref}
        variant={variant}
        size={size}
        leftIcon={<GoogleMark className={size === 'sm' ? 'h-5 w-5' : undefined} />}
        loading={loading}
        loadingText={loadingText}
        onClick={(event) => void handleClick(event)}
      >
        {label}
        {mentionsGoogle ? null : <VisuallyHidden> with Google</VisuallyHidden>}
      </Button>
    );
  },
);
