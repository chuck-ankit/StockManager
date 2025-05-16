import express from 'express';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

// Create transaction
router.post('/', async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get transactions by item ID
router.get('/item/:itemId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ itemId: req.params.itemId })
      .populate('itemId')
      .populate('createdBy');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('itemId')
      .populate('createdBy');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export const transactionRoutes = router; 