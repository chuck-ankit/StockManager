import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Create transaction
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    const { itemId, type, quantity, notes } = req.body;

    // Validate input
    if (!itemId || !type || !quantity) {
      throw new Error('Missing required fields');
    }

    // Get the item
    const item = await InventoryItem.findById(itemId).session(session);
    if (!item) {
      throw new Error('Item not found');
    }

    // Validate stock for stock-out
    if (type === 'stock-out' && item.quantity < quantity) {
      throw new Error('Insufficient stock');
    }

    // Update item quantity
    const newQuantity = type === 'stock-in' ? 
      item.quantity + quantity : 
      item.quantity - quantity;

    // Update the item
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      itemId,
      { 
        quantity: newQuantity,
        status: newQuantity <= 0 ? 'out_of_stock' : 'in_stock',
        lastRestocked: type === 'stock-in' ? new Date() : item.lastRestocked
      },
      { new: true, session }
    );

    if (!updatedItem) {
      throw new Error('Failed to update item');
    }

    // Create the transaction
    const transaction = new Transaction({
      ...req.body,
      createdBy: req.user.userId,
      totalValue: quantity * item.unitPrice
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.status(201).json(transaction);
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Get transactions by item ID
router.get('/item/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const transactions = await Transaction.find({ itemId: req.params.itemId })
      .populate('itemId')
      .populate('createdBy');
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('itemId')
      .populate('createdBy');
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get transaction by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const transactionRoutes = router; 