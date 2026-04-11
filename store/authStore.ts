'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AuthState = {
  user: string | null;
  isLoggedIn: boolean;
  setUser: (email: string) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      setUser: (email) => set({ user: email, isLoggedIn: true }),
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error('logout failed', error);
        }
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name: 'vynra-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
