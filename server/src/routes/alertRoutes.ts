import express from 'express';
import { Alert } from '../models/Alert.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Create alert
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alert = new Alert({
      ...req.body,
      createdBy: req.user.userId
    });
    await alert.save();
    res.status(201).json(alert);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get all alerts
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alerts = await Alert.find();
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get active alerts
router.get('/active', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alerts = await Alert.find({ status: 'active' })
      .populate({
        path: 'itemId',
        select: 'name description reorderPoint'
      });
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get alert by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve alert
router.put('/:id/resolve', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'resolved',
        resolvedAt: new Date()
      },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const alertRoutes = router; 