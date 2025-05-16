import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  type: { type: String, enum: ['low_stock', 'out_of_stock'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

export const Alert = mongoose.model('Alert', alertSchema); 