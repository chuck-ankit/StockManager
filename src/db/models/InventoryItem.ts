import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  minQuantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema); 