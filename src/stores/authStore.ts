import { create } from 'zustand';
import { authService } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await authService.login({ email, password });
      set({ user: response.user, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during login',
        loading: false 
      });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await authService.register({ username, email, password });
      set({ user: response.user, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during registration',
        loading: false 
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, error: null });
  }
}));