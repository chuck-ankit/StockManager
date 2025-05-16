import express from 'express';
import { InventoryItem } from '../models/InventoryItem.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Transaction } from '../models/Transaction.js';
import { Alert } from '../models/Alert.js';

const router = express.Router();

// Create inventory item
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const inventory = new InventoryItem({
      ...req.body,
      createdBy: req.user.userId
    });
    await inventory.save();
    res.status(201).json(inventory);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get all inventory items with filtering and sorting
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      search,
      category,
      status,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      InventoryItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      InventoryItem.countDocuments(query)
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get inventory item by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const inventory = await InventoryItem.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update inventory item
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'name',
      'description',
      'category',
      'quantity',
      'unitPrice',
      'reorderPoint',
      'status',
      'location',
      'supplier',
      'lastRestocked'
    ];
    
    const isValidOperation = Object.keys(updates).every(update => 
      allowedUpdates.includes(update)
    );
    
    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const inventory = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedBy: req.user.userId },
      { new: true, runValidators: true }
    );

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if item is out of stock after update
    if (inventory.quantity <= 0) {
      inventory.status = 'out_of_stock';
      await inventory.save();
    }

    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete inventory item
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const session = await InventoryItem.startSession();
  session.startTransaction();

  try {
    const itemId = req.params.id;

    // Check if item has any transactions
    const transactions = await Transaction.find({ itemId }).session(session);
    if (transactions.length > 0) {
      throw new Error('Cannot delete item with associated transactions');
    }

    // Delete any associated alerts
    const alerts = await Alert.find({ itemId }).session(session);
    await Promise.all(alerts.map((alert: any) => alert.deleteOne({ session })));

    const inventory = await InventoryItem.findByIdAndDelete(itemId).session(session);
    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    await session.commitTransaction();
    res.json({ message: 'Inventory item deleted' });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Get stock-out items
router.get('/status/out-of-stock', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const items = await InventoryItem.find({ status: 'out_of_stock' });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export inventory report
router.get('/export/report', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { format = 'csv' } = req.query;
    const items = await InventoryItem.find();
    
    if (format === 'csv') {
      const csvData = items.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        status: item.status,
        lastRestocked: item.lastRestocked
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
      
      // Convert to CSV string
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      res.send(csvString);
    } else {
      res.json(items);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Stock in endpoint
router.post('/:id/stock-in', authMiddleware, async (req: AuthRequest, res) => {
  const session = await InventoryItem.startSession();
  session.startTransaction();

  try {
    const { quantity, notes } = req.body;
    const itemId = req.params.id;

    if (!quantity || quantity <= 0) {
      throw new Error('Invalid quantity');
    }

    const item = await InventoryItem.findById(itemId).session(session);
    if (!item) {
      throw new Error('Item not found');
    }

    // Update item quantity
    item.quantity += quantity;
    item.lastRestocked = new Date();
    await item.save({ session });

    // Create transaction
    const transaction = new Transaction({
      itemId,
      type: 'stock-in',
      quantity,
      notes,
      createdBy: req.user.userId
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json(item);
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Stock out endpoint
router.post('/:id/stock-out', authMiddleware, async (req: AuthRequest, res) => {
  const session = await InventoryItem.startSession();
  session.startTransaction();

  try {
    const { quantity, notes } = req.body;
    const itemId = req.params.id;

    if (!quantity || quantity <= 0) {
      throw new Error('Invalid quantity');
    }

    const item = await InventoryItem.findById(itemId).session(session);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.quantity < quantity) {
      throw new Error('Insufficient stock');
    }

    // Update item quantity
    item.quantity -= quantity;
    await item.save({ session });

    // Create transaction
    const transaction = new Transaction({
      itemId,
      type: 'stock-out',
      quantity,
      notes,
      createdBy: req.user.userId
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json(item);
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

export const inventoryRoutes = router; 