import mongoose from 'mongoose';

const preferencesSchema = new mongoose.Schema({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  notifications: {
    email: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    stockOut: { type: Boolean, default: true }
  },
  dashboardLayout: {
    type: String,
    enum: ['default', 'compact', 'detailed'],
    default: 'default'
  },
  language: { type: String, default: 'en' }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  preferences: { type: preferencesSchema, default: () => ({}) },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const User = mongoose.model('User', userSchema); 