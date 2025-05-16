import express from 'express';
import { LowStockAlert } from '../models/LowStockAlert.js';

const router = express.Router();

// Create alert
router.post('/', async (req, res) => {
  try {
    const alert = new LowStockAlert(req.body);
    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get active alerts
router.get('/active', async (req, res) => {
  try {
    const alerts = await LowStockAlert.find({ resolved: false })
      .populate('itemId');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve alert
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await LowStockAlert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export const alertRoutes = router; 