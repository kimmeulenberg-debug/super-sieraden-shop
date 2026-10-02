import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (changes: { name: string; email: string }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,

      login: async (email: string, password: string) => {
        // Mock authentication - in production, this would call an API
        if (!email || !password) {
          throw new Error('Email en wachtwoord zijn verplicht');
        }

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock user
        const user: User = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString(),
        };

        set({ user, isLoggedIn: true });
      },

      signup: async (email: string, name: string, password: string) => {
        if (!email || !name || !password) {
          throw new Error('Alle velden zijn verplicht');
        }

        if (password.length < 6) {
          throw new Error('Wachtwoord moet minimaal 6 karakters zijn');
        }

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock user
        const user: User = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          name,
          createdAt: new Date().toISOString(),
        };

        set({ user, isLoggedIn: true });
      },

      logout: () => {
        set({ user: null, isLoggedIn: false });
      },

      updateProfile: ({ name, email }) => {
        set((state) => (state.user ? { user: { ...state.user, name, email } } : state));
      },
    }),
    {
      name: 'supSieradenShop_auth',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
