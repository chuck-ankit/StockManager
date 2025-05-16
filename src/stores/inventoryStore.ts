import { create } from 'zustand';
import { inventoryService, transactionService, alertService } from '../services/api';
import { InventoryItem, Transaction, PaginationState } from '../types';

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  
  // Actions
  fetchItems: (page?: number, pageSize?: number, category?: string) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  stockIn: (itemId: string, quantity: number, notes?: string) => Promise<boolean>;
  stockOut: (itemId: string, quantity: number, notes?: string) => Promise<boolean>;
  searchItems: (query: string) => Promise<InventoryItem[]>;
  addTransaction: (transaction: Omit<Transaction, '_id'>) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0
  },

  fetchItems: async (page = 1, pageSize = 10, category?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await inventoryService.getItems({ page, limit: pageSize, category });
      
      set({ 
        items: response.items, 
        loading: false,
        pagination: {
          page: response.page,
          pageSize,
          total: response.total
        }
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load inventory items';
      set({ loading: false, error: errorMessage });
      
      // Handle auth errors
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 
          'status' in error.response && error.response.status === 401) {
        window.location.href = '/login';
      }
    }
  },

  addItem: async (itemData) => {
    try {
      const newItem = await inventoryService.createItem(itemData);
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      return newItem._id.toString();
    } catch (error) {
      console.error('Error adding item:', error);
      set({ error: 'Failed to add item' });
      throw error;
    }
  },

  updateItem: async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const success = await inventoryService.updateItem(id, updates);
      if (success) {
        await get().fetchItems(get().pagination.page, get().pagination.pageSize);
        return true;
      }
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update item' });
      return false;
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null });
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid item ID');
      }

      // Check if item has any transactions
      const transactions = await transactionService.getAllTransactions();
      const hasTransactions = transactions.some((t: any) => t.itemId === id);
      
      if (hasTransactions) {
        throw new Error('Cannot delete item with associated transactions');
      }

      // Delete any associated alerts first
      const alerts = await alertService.getActiveAlerts();
      const itemAlerts = alerts.filter((alert: any) => alert.itemId === id);
      await Promise.all(itemAlerts.map((alert: any) => alertService.resolveAlert(alert.id)));

      const success = await inventoryService.deleteItem(id);
      
      if (!success) {
        throw new Error('Failed to delete item');
      }

      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      set({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  stockIn: async (itemId, quantity, notes) => {
    set({ loading: true, error: null });
    try {
      if (!itemId || typeof itemId !== 'string') {
        throw new Error('Invalid item ID');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Get latest item data from server
      const item = await inventoryService.getItem(itemId);

      if (!item) {
        throw new Error('Item not found');
      }

      const transaction = await transactionService.createTransaction({
        itemId,
        type: 'stock-in',
        quantity,
        notes,
        date: new Date().toISOString()
      });

      if (transaction) {
        // Check if item is still below reorder point after stock in
        const newQuantity = item.quantity + quantity;
        if (newQuantity <= item.reorderPoint) {
          await alertService.createAlert({
            itemId,
            type: 'low_stock',
            message: `${item.name} (${item.description || 'No description'}) is below reorder point (${item.reorderPoint})`,
            date: new Date().toISOString()
          });
        }
        await get().fetchItems();
        set({ loading: false, error: null });
        return true;
      }
      set({ loading: false, error: 'Failed to create transaction' });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process stock-in';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  stockOut: async (itemId: string, quantity: number, notes?: string): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      if (!itemId || typeof itemId !== 'string') {
        throw new Error('Invalid item ID');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Check current stock level
      const item = await inventoryService.getItem(itemId);
      if (!item) {
        throw new Error('Item not found');
      }
      if (item.quantity < quantity) {
        throw new Error('Insufficient stock');
      }

      const transaction = await transactionService.createTransaction({
        itemId,
        type: 'stock-out',
        quantity,
        notes,
        date: new Date().toISOString()
      });

      if (transaction) {
        // Check if item will be below reorder point after stock out
        const newQuantity = item.quantity - quantity;
        if (newQuantity <= item.reorderPoint) {
          await alertService.createAlert({
            itemId,
            type: 'low_stock',
            message: `${item.name} (${item.description || 'No description'}) is below reorder point (${item.reorderPoint})`,
            date: new Date().toISOString()
          });
        }
        await get().fetchItems();
        set({ loading: false, error: null });
        return true;
      }
      set({ loading: false, error: 'Failed to create transaction' });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process stock-out';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  searchItems: async (query: string) => {
    try {
      const response = await inventoryService.getItems({ search: query });
      return response.items.filter((item: InventoryItem) => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching items:', error);
      return [];
    }
  },

  addTransaction: async (transaction) => {
    try {
      await transactionService.createTransaction(transaction);
      
      // Update the item quantity
      const item = get().items.find(i => i.id === transaction.itemId);
      if (item) {
        const newQuantity = transaction.type === 'stock-in' 
          ? item.quantity + transaction.quantity
          : item.quantity - transaction.quantity;
        
        await get().updateItem(transaction.itemId, { quantity: newQuantity });

        // Check for low stock alert
        if (newQuantity <= item.minQuantity) {
          await alertService.createAlert({
            itemId: transaction.itemId,
            date: new Date().toISOString()
          });
        }
      }
      
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add transaction',
        loading: false 
      });
      throw error;
    }
  }
}));