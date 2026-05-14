import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';

export function useLogout() {
  const navigate = useNavigate();
  const clearSession = useSessionStore((state) => state.clearSession);

  return useCallback(() => {
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);
}
