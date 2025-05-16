import { create } from 'zustand';
import { authService } from '../services/api';
import { User } from '../types/User';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    set({ loading: true });
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        // Set the token in the Authorization header first
        authService.setAuthToken(token);
        
        // Try to validate the token by fetching user profile
        const profile = await authService.getProfile();
        
        // If successful, update the state
        set({ 
          user: profile, 
          isAuthenticated: true, 
          loading: false,
          error: null 
        });
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        // Only clear storage if it's an authentication error
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          authService.setAuthToken(null);
          set({ 
            user: null, 
            isAuthenticated: false, 
            loading: false,
            error: 'Session expired. Please login again.' 
          });
        } else {
          // For other errors, keep the stored data and try to maintain the session
          set({ 
            isAuthenticated: true, // Keep authenticated state
            loading: false,
            error: null 
          });
        }
      }
    } else {
      authService.setAuthToken(null);
      set({ 
        user: null, 
        isAuthenticated: false, 
        loading: false,
        error: null 
      });
    }
  },

  login: async (identifier: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await authService.login(identifier, password);
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Set the token in the Authorization header
      authService.setAuthToken(response.token);
      
      set({ user: response.user, loading: false, isAuthenticated: true });
    } catch (error) {
      console.error('Login error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during login',
        loading: false,
        isAuthenticated: false
      });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await authService.register(username, email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      authService.setAuthToken(response.token);
      set({ user: response.user, loading: false, isAuthenticated: true });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during registration',
        loading: false,
        isAuthenticated: false
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authService.setAuthToken(null);
    set({ user: null, error: null, isAuthenticated: false });
  }
}));