import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { posApi } from '@/services/api/posApi';
import { clearStoredToken, setStoredToken } from '@/services/api/tokenStorage';
import type { AuthUser } from '@/types/api';

interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

interface SessionState {
  currentUser: AuthUser | null;
  accessToken: string | null;
  isReady: boolean;
  isAuthenticating: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  hydrateSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      accessToken: null,
      isReady: false,
      isAuthenticating: false,
      login: async (payload) => {
        set({ isAuthenticating: true });

        try {
          const session = await posApi.login(payload);
          setStoredToken(session.access_token);

          const user = await posApi.getMe();
          set({
            currentUser: user,
            accessToken: session.access_token,
            isAuthenticating: false,
            isReady: true,
          });

          return user;
        } catch (error) {
          clearStoredToken();
          set({
            currentUser: null,
            accessToken: null,
            isAuthenticating: false,
            isReady: true,
          });
          throw error;
        }
      },
      hydrateSession: async () => {
        const { accessToken, isReady, isAuthenticating } = get();

        if (isAuthenticating) {
          return;
        }

        if (!accessToken) {
          clearStoredToken();
          if (!isReady) {
            set({ currentUser: null, isReady: true });
          }
          return;
        }

        setStoredToken(accessToken);
        set({ isAuthenticating: true });

        try {
          const user = await posApi.getMe();
          set({
            currentUser: user,
            isAuthenticating: false,
            isReady: true,
          });
        } catch {
          clearStoredToken();
          set({
            currentUser: null,
            accessToken: null,
            isAuthenticating: false,
            isReady: true,
          });
        }
      },
      clearSession: () => {
        clearStoredToken();
        set({
          currentUser: null,
          accessToken: null,
          isAuthenticating: false,
          isReady: true,
        });
      },
    }),
    {
      name: 'microservicios-pos-session',
      partialize: (state) => ({
        currentUser: state.currentUser,
        accessToken: state.accessToken,
      }),
    },
  ),
);
