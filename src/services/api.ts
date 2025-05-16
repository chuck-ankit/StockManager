import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authService = {
  async register(userData: { username: string; email: string; password: string }) {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  async login(credentials: { email: string; password: string }) {
    const response = await api.post('/users/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },

  getCurrentUser() {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  }
};

// Inventory services
export const inventoryService = {
  async getAllItems() {
    const response = await api.get('/inventory');
    return response.data;
  },

  async getItemById(id: string) {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  async createItem(itemData: any) {
    const response = await api.post('/inventory', itemData);
    return response.data;
  },

  async updateItem(id: string, itemData: any) {
    const response = await api.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  async deleteItem(id: string) {
    const response = await api.delete(`/inventory/${id}`);
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
    const response = await api.put(`/alerts/${id}/resolve`);
    return response.data;
  }
}; 