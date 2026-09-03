import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.error('MongoDB connection error: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: 'polaris',
    });
    logger.info('MongoDB connected successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    logger.error(`MongoDB connection failed: ${message}`);
    process.exit(1);
  }
};
