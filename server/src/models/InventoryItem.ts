import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  minQuantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  reorderPoint: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  location: { type: String },
  supplier: { type: String },
  lastRestocked: { type: Date },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
inventoryItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update status based on quantity
  if (this.quantity <= 0) {
    this.status = 'out_of_stock';
  } else if (this.quantity <= this.reorderPoint) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  
  next();
});

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema); 