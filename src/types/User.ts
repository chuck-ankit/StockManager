export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    lowStock: boolean;
    stockOut: boolean;
  };
  dashboardLayout: 'default' | 'compact' | 'detailed';
  language: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordUpdate {
  currentPassword: string;
  password: string;
}

export type UserUpdate = Partial<User> | PasswordUpdate; 