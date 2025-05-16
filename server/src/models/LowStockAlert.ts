import mongoose from 'mongoose';

const lowStockAlertSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  date: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

export const LowStockAlert = mongoose.model('LowStockAlert', lowStockAlertSchema); 