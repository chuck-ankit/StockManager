import axios from 'axios';
import { User, UserUpdate } from '../types/User';
import { ReportFilter } from '../types';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh the token or get a new one if possible
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          // Try to get a new token using the existing one
          const response = await api.post('/users/refresh-token', { token });
          const { token: newToken } = response.data;
          
          // Update the token
          localStorage.setItem('token', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          // Retry the original request
          error.config.headers['Authorization'] = `Bearer ${newToken}`;
          return api(error.config);
        } catch (refreshError) {
          // If refresh fails, only then clear the session
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } else {
        // No token or user data, redirect to login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  async login(identifier: string, password: string) {
    const response = await api.post('/users/login', { identifier, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  async register(username: string, email: string, password: string) {
    const response = await api.post('/users/register', { username, email, password });
    return response.data;
  },

  async updateProfile(updates: UserUpdate) {
    const response = await api.patch('/users/profile', updates);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/users/profile');
    return response.data;
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  },

  setAuthToken(token: string | null) {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Inventory services
export const inventoryService = {
  async getItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.get('/inventory', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  async getItem(id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid item ID');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.get(`/inventory/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  },

  async createItem(item: any) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.post('/inventory', item, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<boolean> {
    if (!id) {
      throw new Error('Invalid item ID');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await api.put(`/inventory/${id}`, updates, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update item');
      }
      throw error;
    }
  },

  async stockIn(id: string, data: { quantity: number; notes?: string }) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid item ID');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.post(`/inventory/${encodeURIComponent(id)}/stock-in`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  },

  async stockOut(id: string, data: { quantity: number; notes?: string }) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid item ID');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.post(`/inventory/${encodeURIComponent(id)}/stock-out`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error removing stock:', error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid item ID');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await api.delete(`/inventory/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Cannot delete item with associated transactions');
      }
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  async getOutOfStockItems() {
    const response = await api.get('/inventory/status/out-of-stock');
    return response.data;
  },

  async exportReport(format: 'csv' | 'json' = 'csv') {
    const response = await api.get('/inventory/export/report', {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};

// Transaction services
export const transactionService = {
  async getAllTransactions() {
    const response = await api.get('/transactions');
    return response.data;
  },

  async getTransactionsByItem(itemId: string) {
    const response = await api.get(`/transactions/item/${itemId}`);
    return response.data;
  },

  async createTransaction(transactionData: any) {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  }
};

// Alert services
export const alertService = {
  async getActiveAlerts() {
    const response = await api.get('/alerts/active');
    return response.data;
  },

  async createAlert(alertData: any) {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  async resolveAlert(id: string) {
    const response = await api.put(`/alerts/${encodeURIComponent(id)}/resolve`);
    return response.data;
  }
};

// Report services
export const reportService = {
  getTransactions: async (filter?: ReportFilter) => {
    try {
      const response = await api.get('/transactions', { params: filter });
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  },

  generateInventoryReport: async (filter?: ReportFilter) => {
    try {
      const response = await api.get('/reports/inventory', { 
        params: {
          ...filter,
          startDate: filter?.startDate?.toISOString(),
          endDate: filter?.endDate?.toISOString()
        }
      });
      if (!response.data) {
        throw new Error('No data received from server');
      }
      return response.data;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw new Error('Failed to generate inventory report');
    }
  },

  generateTransactionReport: async (filter?: ReportFilter) => {
    try {
      const response = await api.get('/reports/transactions', { 
        params: {
          ...filter,
          startDate: filter?.startDate?.toISOString(),
          endDate: filter?.endDate?.toISOString()
        }
      });
      if (!response.data) {
        throw new Error('No data received from server');
      }
      return response.data;
    } catch (error) {
      console.error('Error generating transaction report:', error);
      throw new Error('Failed to generate transaction report');
    }
  }
}; 