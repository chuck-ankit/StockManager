import { create } from 'zustand';
import db from '../db/db';
import { AuthState, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useAuthStore = create<AuthState>((set) => {
  // Initialize user from localStorage if available
  const storedUser = localStorage.getItem('user');
  const initialState = storedUser 
    ? { user: JSON.parse(storedUser), isAuthenticated: true } 
    : { user: null, isAuthenticated: false };

  return {
    ...initialState,

    login: async (email: string, password: string) => {
      try {
        // In a real app, we'd make an API call to validate credentials
        const user = await db.users
          .where('email')
          .equals(email.toLowerCase())
          .first();

        if (user && user.password === password) { // In real app, would use proper password comparison
          set({ user, isAuthenticated: true });
          localStorage.setItem('user', JSON.stringify(user));
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login error:', error);
        return false;
      }
    },

    register: async (username: string, email: string, password: string) => {
      try {
        // Check if user already exists
        const existingUser = await db.users
          .where('email')
          .equals(email.toLowerCase())
          .first();

        if (existingUser) {
          return false;
        }

        // Create new user
        const newUser: User = {
          id: uuidv4(),
          username,
          email: email.toLowerCase(),
          password, // In a real app, this would be hashed
          createdAt: new Date()
        };

        await db.users.add(newUser);
        
        // Auto login after registration
        set({ user: newUser, isAuthenticated: true });
        localStorage.setItem('user', JSON.stringify(newUser));
        
        return true;
      } catch (error) {
        console.error('Registration error:', error);
        return false;
      }
    },

    logout: () => {
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('user');
    }
  };
});