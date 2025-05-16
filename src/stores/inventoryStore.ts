import { create } from 'zustand';
import db, { broadcastChange } from '../db/db';
import { InventoryItem, Transaction, PaginationState } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
      let query = db.inventory;
      
      // Apply category filter if provided
      if (category) {
        query = query.where('category').equals(category);
      }

      // Get total count for pagination
      const total = await query.count();
      
      // Apply pagination
      const offset = (page - 1) * pageSize;
      const items = await query
        .offset(offset)
        .limit(pageSize)
        .toArray();

      set({ 
        items, 
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
      const newItem: InventoryItem = {
        ...itemData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await db.inventory.add(newItem);
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      // Broadcast the change for real-time updates
      broadcastChange('inventory-updated', { action: 'added', item: newItem });
      
      return id as string;
    } catch (error) {
      console.error('Error adding item:', error);
      set({ error: 'Failed to add item' });
      throw error;
    }
  },

  updateItem: async (id, updates) => {
    try {
      const item = await db.inventory.get(id);
      if (!item) return false;

      const updatedItem = {
        ...item,
        ...updates,
        updatedAt: new Date()
      };

      await db.inventory.update(id, updatedItem);
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      // Broadcast the change
      broadcastChange('inventory-updated', { action: 'updated', item: updatedItem });
      
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
      const hasTransactions = await db.transactions
        .where('itemId')
        .equals(id)
        .count() > 0;

      if (hasTransactions) {
        set({ error: 'Cannot delete item with existing transactions' });
        return false;
      }

      // Delete the item
      await db.inventory.delete(id);
      
      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      // Broadcast the change
      broadcastChange('inventory-updated', { action: 'deleted', itemId: id });
      
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      set({ error: 'Failed to delete item' });
      return false;
    }
  },

  stockIn: async (itemId, quantity, notes) => {
    try {
      const item = await db.inventory.get(itemId);
      if (!item) return false;

      // Start a transaction
      await db.transaction('rw', [db.inventory, db.transactions], async () => {
        // Update inventory
        const newQuantity = item.quantity + quantity;
        await db.inventory.update(itemId, { 
          quantity: newQuantity,
          updatedAt: new Date()
        });

        // Record transaction
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const transaction: Transaction = {
          id: uuidv4(),
          itemId,
          quantity,
          type: 'stock-in',
          date: new Date(),
          notes,
          createdBy: user.id || 'unknown'
        };
        
        await db.transactions.add(transaction);
        
        // Check if this resolves a low stock alert
        if (newQuantity > item.minQuantity) {
          const alerts = await db.lowStockAlerts
            .where('itemId')
            .equals(itemId)
            .and(alert => !alert.resolved)
            .toArray();
            
          if (alerts.length > 0) {
            await Promise.all(alerts.map(alert => 
              db.lowStockAlerts.update(alert.id, { resolved: true })
            ));
          }
        }
      });

      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      // Broadcast the change
      broadcastChange('inventory-updated', { 
        action: 'stock-in', 
        itemId, 
        quantity 
      });
      
      return true;
    } catch (error) {
      console.error('Error processing stock in:', error);
      set({ error: 'Failed to process stock in' });
      return false;
    }
  },

  stockOut: async (itemId, quantity, notes) => {
    try {
      const item = await db.inventory.get(itemId);
      if (!item) return false;

      if (item.quantity < quantity) {
        set({ error: 'Insufficient stock' });
        return false;
      }

      // Start a transaction
      await db.transaction('rw', [db.inventory, db.transactions, db.lowStockAlerts], async () => {
        // Update inventory
        const newQuantity = item.quantity - quantity;
        await db.inventory.update(itemId, { 
          quantity: newQuantity,
          updatedAt: new Date()
        });

        // Record transaction
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const transaction: Transaction = {
          id: uuidv4(),
          itemId,
          quantity,
          type: 'stock-out',
          date: new Date(),
          notes,
          createdBy: user.id || 'unknown'
        };
        
        await db.transactions.add(transaction);
        
        // Check if we need to create a low stock alert
        if (newQuantity <= item.minQuantity) {
          // Check if there's already an unresolved alert
          const existingAlert = await db.lowStockAlerts
            .where('itemId')
            .equals(itemId)
            .and(alert => !alert.resolved)
            .first();
            
          if (!existingAlert) {
            await db.lowStockAlerts.add({
              id: uuidv4(),
              itemId,
              date: new Date(),
              resolved: false
            });
            
            // Broadcast low stock alert
            broadcastChange('low-stock-alert', { 
              itemId, 
              name: item.name,
              quantity: newQuantity
            });
          }
        }
      });

      // Refresh item list
      await get().fetchItems(get().pagination.page, get().pagination.pageSize);
      
      // Broadcast the change
      broadcastChange('inventory-updated', { 
        action: 'stock-out', 
        itemId, 
        quantity 
      });
      
      return true;
    } catch (error) {
      console.error('Error processing stock out:', error);
      set({ error: 'Failed to process stock out' });
      return false;
    }
  },

  searchItems: async (query) => {
    try {
      if (!query) {
        return [];
      }

      const searchTerm = query.toLowerCase();
      const allItems = await db.inventory.toArray();
      
      return allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching items:', error);
      set({ error: 'Failed to search items' });
      return [];
    }
  }
}));