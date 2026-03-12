import { create } from 'zustand';
import type { User, UserRole } from '@/types/api';

interface SessionState {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  clearSession: () => set({ currentUser: null }),
}));

export function buildMockUser(name: string, role: UserRole): User {
  return {
    id: 1,
    name,
    role,
  };
}
