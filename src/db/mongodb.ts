import mongoose from 'mongoose';

// MongoDB connection string - replace with your actual MongoDB URI
const MONGODB_URI = 'mongodb://localhost:27017/stockmanager';

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Disconnect from MongoDB
export async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB successfully');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Export mongoose instance
export default mongoose; 