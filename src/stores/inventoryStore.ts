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
      const items = await inventoryService.getAllItems();
      
      // Apply category filter if provided
      const filteredItems = category 
        ? items.filter(item => item.category === category)
        : items;

      // Apply pagination
      const total = filteredItems.length;
      const start = (page - 1) * pageSize;
      const paginatedItems = filteredItems.slice(start, start + pageSize);

      set({ 
        items: paginatedItems, 
        loading: false,
        pagination: {
          page,
          pageSize,
          total
        }
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      set({ loading: false, error: 'Failed to load inventory items' });
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

  updateItem: async (id, updates) => {
    try {
      const updatedItem = await inventoryService.updateItem(id, updates);
      if (!updatedItem) return false;
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      set({ error: 'Failed to update item' });
      return false;
    }
  },

  deleteItem: async (id) => {
    try {
      // First check if there are transactions for this item
      const transactions = await transactionService.getTransactionsByItemId(id);
      if (transactions.length > 0) {
        set({ error: 'Cannot delete item with existing transactions' });
        return false;
      }

      // Delete the item
      await inventoryService.deleteItem(id);
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      set({ error: 'Failed to delete item' });
      return false;
    }
  },

  stockIn: async (itemId, quantity, notes) => {
    try {
      const item = await inventoryService.getItemById(itemId);
      if (!item) return false;

      // Update inventory
      const newQuantity = item.quantity + quantity;
      await inventoryService.updateItem(itemId, { 
        quantity: newQuantity,
        updatedAt: new Date()
      });

      // Record transaction
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await transactionService.createTransaction({
        itemId,
        quantity,
        type: 'stock-in',
        date: new Date(),
        notes,
        createdBy: user._id || 'unknown'
      });
      
      // Check if this resolves a low stock alert
      if (newQuantity > item.minQuantity) {
        const alerts = await alertService.getActiveAlerts();
        const itemAlerts = alerts.filter(alert => alert.itemId.toString() === itemId);
        
        if (itemAlerts.length > 0) {
          await Promise.all(itemAlerts.map(alert => 
            alertService.resolveAlert(alert._id.toString())
          ));
        }
      }

      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      return true;
    } catch (error) {
      console.error('Error processing stock-in:', error);
      set({ error: 'Failed to process stock-in' });
      return false;
    }
  },

  stockOut: async (itemId, quantity, notes) => {
    try {
      const item = await inventoryService.getItemById(itemId);
      if (!item) return false;

      if (item.quantity < quantity) {
        set({ error: 'Insufficient stock' });
        return false;
      }

      // Update inventory
      const newQuantity = item.quantity - quantity;
      await inventoryService.updateItem(itemId, { 
        quantity: newQuantity,
        updatedAt: new Date()
      });

      // Record transaction
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await transactionService.createTransaction({
        itemId,
        quantity,
        type: 'stock-out',
        date: new Date(),
        notes,
        createdBy: user._id || 'unknown'
      });

      // Check if this creates a low stock alert
      if (newQuantity <= item.minQuantity) {
        await alertService.createAlert({
          itemId,
          date: new Date(),
          resolved: false
        });
      }

      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      return true;
    } catch (error) {
      console.error('Error processing stock-out:', error);
      set({ error: 'Failed to process stock-out' });
      return false;
    }
  },

  searchItems: async (query) => {
    try {
      const items = await inventoryService.getAllItems();
      return items.filter(item => 
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
      set({ loading: true, error: null });
      await transactionService.createTransaction(transaction);
      
      // Update the item quantity
      const item = get().items.find(i => i._id === transaction.itemId);
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