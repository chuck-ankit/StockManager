import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { InventoryItem } from '../models/InventoryItem';
import { AuthRequest } from '../types';

const router = express.Router();

// Generate transaction report
router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, transactionType } = req.query;
    
    const query: any = {};
    
    if (startDate) {
      query.date = { $gte: new Date(startDate as string) };
    }
    
    if (endDate) {
      query.date = { ...query.date, $lte: new Date(endDate as string) };
    }
    
    if (transactionType) {
      query.type = transactionType;
    }
    
    const transactions = await Transaction.find(query)
      .populate('itemId', 'name category')
      .populate('createdBy', 'username')
      .sort({ date: -1 });
    
    // Transform the data for the report
    const reportData = transactions.map(transaction => ({
      id: transaction._id,
      date: transaction.date,
      itemName: transaction.itemId.name,
      itemCategory: transaction.itemId.category,
      type: transaction.type,
      quantity: transaction.quantity,
      totalValue: transaction.quantity * (transaction.itemId as any).unitPrice,
      notes: transaction.notes,
      createdBy: transaction.createdBy.username
    }));
    
    res.json(reportData);
  } catch (error: any) {
    console.error('Error generating transaction report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate inventory report
router.get('/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    const query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    const items = await InventoryItem.find(query);
    
    // Get transaction data for each item
    const reportData = await Promise.all(items.map(async (item) => {
      const transactionQuery: any = { itemId: item._id };
      
      if (startDate) {
        transactionQuery.date = { $gte: new Date(startDate as string) };
      }
      
      if (endDate) {
        transactionQuery.date = { ...transactionQuery.date, $lte: new Date(endDate as string) };
      }
      
      const [stockIn, stockOut] = await Promise.all([
        Transaction.aggregate([
          { $match: { ...transactionQuery, type: 'stock-in' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]),
        Transaction.aggregate([
          { $match: { ...transactionQuery, type: 'stock-out' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ])
      ]);
      
      const totalStockIn = stockIn[0]?.total || 0;
      const totalStockOut = stockOut[0]?.total || 0;
      
      return {
        id: item._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        stockIn: totalStockIn,
        stockOut: totalStockOut,
        turnover: totalStockOut / (item.quantity || 1),
        value: item.quantity * item.unitPrice,
        updatedAt: item.updatedAt
      };
    }));
    
    res.json(reportData);
  } catch (error: any) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router; 