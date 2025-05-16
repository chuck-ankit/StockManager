import express, { Request, Response } from 'express';
import { User } from '../models/User.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { 
  loginLimiter, 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} from '../config/security.js';

const router = express.Router();

// Register user
router.post('/register', validateRegistration, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id.toString());
    
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    
    res.status(201).json({ user: userResponse, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Login user
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }
    
    const token = generateToken(user._id.toString());
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    
    res.json({ user: userResponse, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    res.json(userResponse);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.patch('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['username', 'email', 'firstName', 'lastName', 'preferences', 'currentPassword', 'password'];
    const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle password update
    if (updates.password) {
      if (!updates.currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const isMatch = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Validate new password
      if (updates.password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(updates.password)) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long and contain at least one letter, one number, and one special character' 
        });
      }

      user.password = await bcrypt.hash(updates.password, 10);
      delete updates.currentPassword;
      delete updates.password;
    }

    // Handle preferences update
    if (updates.preferences) {
      user.preferences = {
        theme: updates.preferences.theme || user.preferences.theme || 'system',
        dashboardLayout: updates.preferences.dashboardLayout || user.preferences.dashboardLayout || 'default',
        notifications: {
          email: updates.preferences.notifications?.email ?? user.preferences.notifications?.email ?? true,
          lowStock: updates.preferences.notifications?.lowStock ?? user.preferences.notifications?.lowStock ?? true,
          stockOut: updates.preferences.notifications?.stockOut ?? user.preferences.notifications?.stockOut ?? true
        },
        language: updates.preferences.language || user.preferences.language || 'en'
      };
      delete updates.preferences;
    }

    // Update other fields
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.email !== undefined) {
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      user.email = updates.email;
    }
    if (updates.username !== undefined) {
      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,}$/.test(updates.username)) {
        return res.status(400).json({ message: 'Username must be at least 3 characters long and contain only letters, numbers, and underscores' });
      }
      user.username = updates.username;
    }

    await user.save();
    
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    
    // Generate new token
    const token = generateToken(user._id.toString());
    
    res.json({ user: userResponse, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Find user by email (protected route)
router.get('/email/:email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    res.json(userResponse);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Find user by ID (protected route)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    res.json(userResponse);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add token refresh endpoint
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify the existing token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload & { userId: string };
    
    // Generate a new token
    const newToken = generateToken(decoded.userId);
    
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

export const userRoutes = router; 