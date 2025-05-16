import { User } from '../models/User';
import { InventoryItem } from '../models/InventoryItem';
import { Transaction } from '../models/Transaction';
import { LowStockAlert } from '../models/LowStockAlert';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';

// User operations
export const userService = {
  async createUser(userData: any) {
    const user = new User(userData);
    return await user.save();
  },

  async findUserByEmail(email: string) {
    return await User.findOne({ email });
  },

  async findUserById(id: string) {
    return await User.findById(id);
  }
};

// Inventory operations
export const inventoryService = {
  async createItem(itemData: any) {
    const item = new InventoryItem(itemData);
    return await item.save();
  },

  async getAllItems() {
    return await InventoryItem.find();
  },

  async getItemById(id: string) {
    return await InventoryItem.findById(id);
  },

  async updateItem(id: string, updateData: any) {
    return await InventoryItem.findByIdAndUpdate(id, updateData, { new: true });
  },

  async deleteItem(id: string) {
    return await InventoryItem.findByIdAndDelete(id);
  }
};

// Transaction operations
export const transactionService = {
  async createTransaction(transactionData: any) {
    const transaction = new Transaction(transactionData);
    return await transaction.save();
  },

  async getTransactionsByItemId(itemId: string) {
    return await Transaction.find({ itemId }).populate('itemId');
  },

  async getAllTransactions() {
    return await Transaction.find().populate('itemId');
  }
};

// Low Stock Alert operations
export const alertService = {
  async createAlert(alertData: any) {
    const alert = new LowStockAlert(alertData);
    return await alert.save();
  },

  async getActiveAlerts() {
    return await LowStockAlert.find({ resolved: false }).populate('itemId');
  },

  async resolveAlert(id: string) {
    return await LowStockAlert.findByIdAndUpdate(id, { resolved: true }, { new: true });
  }
};

// Initialize database connection
export async function initializeDatabase() {
  try {
    await connectToMongoDB();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
} 