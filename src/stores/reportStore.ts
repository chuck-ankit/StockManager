import { create } from 'zustand';
import { inventoryService, transactionService } from '../db/services/databaseService';
import { Transaction, ReportFilter } from '../types';

interface ReportState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTransactions: (filter?: ReportFilter) => Promise<void>;
  generateInventoryReport: (filter?: ReportFilter) => Promise<any>;
  generateTransactionReport: (filter?: ReportFilter) => Promise<any>;
  exportToCsv: (data: any[], filename: string) => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (filter = {}) => {
    set({ loading: true, error: null });
    try {
      let transactions = await transactionService.getAllTransactions();
      
      // Apply filters
      if (filter.startDate) {
        transactions = transactions.filter(t => t.date >= filter.startDate!);
      }
      
      if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        transactions = transactions.filter(t => t.date <= endDate);
      }
      
      if (filter.itemId) {
        transactions = transactions.filter(t => t.itemId.toString() === filter.itemId);
      }
      
      if (filter.transactionType) {
        transactions = transactions.filter(t => t.type === filter.transactionType);
      }
      
      // Sort by date (newest first)
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      set({ transactions, loading: false });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ loading: false, error: 'Failed to fetch transactions' });
    }
  },

  generateInventoryReport: async (filter = {}) => {
    set({ loading: true });
    try {
      let inventoryItems = await inventoryService.getAllItems();
      
      // Apply category filter if provided
      if (filter.category) {
        inventoryItems = inventoryItems.filter(item => item.category === filter.category);
      }
      
      // Enhance inventory data with transaction history
      const enhancedItems = await Promise.all(
        inventoryItems.map(async item => {
          // Get transactions for this item
          let transactions = await transactionService.getTransactionsByItemId(item._id.toString());
          
          // Apply date filters
          if (filter.startDate) {
            transactions = transactions.filter(t => t.date >= filter.startDate!);
          }
          
          if (filter.endDate) {
            const endDate = new Date(filter.endDate);
            endDate.setHours(23, 59, 59, 999);
            transactions = transactions.filter(t => t.date <= endDate);
          }
          
          // Calculate movement stats
          const stockIn = transactions
            .filter(t => t.type === 'stock-in')
            .reduce((sum, t) => sum + t.quantity, 0);
            
          const stockOut = transactions
            .filter(t => t.type === 'stock-out')
            .reduce((sum, t) => sum + t.quantity, 0);
          
          return {
            ...item,
            stockIn,
            stockOut,
            turnover: stockOut / ((item.quantity + stockOut) / 2), // Inventory turnover ratio
            value: item.quantity * item.price
          };
        })
      );
      
      set({ loading: false });
      return enhancedItems;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      set({ loading: false, error: 'Failed to generate inventory report' });
      return [];
    }
  },

  generateTransactionReport: async (filter = {}) => {
    await get().fetchTransactions(filter);
    const { transactions } = get();
    
    if (transactions.length === 0) {
      return [];
    }
    
    // Get item details for each transaction
    const itemIds = [...new Set(transactions.map(t => t.itemId.toString()))];
    const items = await Promise.all(
      itemIds.map(id => inventoryService.getItemById(id))
    );
    
    const itemMap = new Map(items.map(item => [item._id.toString(), item]));
    
    // Enhance transactions with item details
    const enhancedTransactions = transactions.map(transaction => {
      const item = itemMap.get(transaction.itemId.toString());
      return {
        ...transaction,
        itemName: item ? item.name : 'Unknown Item',
        itemCategory: item ? item.category : 'Unknown Category',
        itemPrice: item ? item.price : 0,
        totalValue: item ? transaction.quantity * item.price : 0
      };
    });
    
    return enhancedTransactions;
  },

  exportToCsv: (data, filename) => {
    if (!data || !data.length) {
      console.error('No data to export');
      return;
    }
    
    // Get headers from the first item
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          
          // Format dates
          if (value instanceof Date) {
            value = value.toLocaleString();
          }
          
          // Handle commas and quotes in the content
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}));