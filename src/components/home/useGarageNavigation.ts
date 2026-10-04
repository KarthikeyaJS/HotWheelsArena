import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { garagePath, type GarageTab } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuthAction } from '@/hooks/useRequireAuthAction';

export interface GarageNavigation {
  signedIn: boolean;
  /**
   * Opens My Garage (optionally a tab). Signed out → the Google sign-in prompt opens first and
   * the navigation runs right after a successful sign-in.
   */
  openGarage: (tab?: GarageTab, reason?: string) => void;
}

/** Auth-gated navigation to My Garage for the home teasers. */
export function useGarageNavigation(): GarageNavigation {
  const { status } = useAuth();
  const navigate = useNavigate();
  const requireAuth = useRequireAuthAction();

  const openGarage = useCallback(
    (tab?: GarageTab, reason = 'Sign in with Google to open your garage.') => {
      requireAuth(() => navigate(garagePath(tab)), reason);
    },
    [navigate, requireAuth],
  );

  return { signedIn: status === 'signed-in', openGarage };
}
