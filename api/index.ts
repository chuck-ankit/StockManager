import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { userRoutes } from '../server/src/routes/userRoutes.js';
import { inventoryRoutes } from '../server/src/routes/inventoryRoutes.js';
import { transactionRoutes } from '../server/src/routes/transactionRoutes.js';
import { alertRoutes } from '../server/src/routes/alertRoutes.js';
import reportRoutes from '../server/src/routes/reportRoutes.js';
import { 
  apiLimiter, 
  errorHandler, 
  securityHeaders, 
  corsOptions 
} from '../server/src/config/security.js';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet(securityHeaders));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(apiLimiter);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI!;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB Connection Established');
})
.catch((error) => {
  console.error('MongoDB Connection Error:', error.message);
});

// Export the Express API
export default app; 