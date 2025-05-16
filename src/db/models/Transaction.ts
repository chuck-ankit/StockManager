import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['stock-in', 'stock-out'], required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

export const Transaction = mongoose.model('Transaction', transactionSchema); 