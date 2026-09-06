import app from './app';
import { config, validateProductionEnv } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import mongoose from 'mongoose';

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    logger.info(`POLARIS server running on http://localhost:${port}`);
    logger.info(`Health check available at http://localhost:${port}/api/health`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use (often used by macOS AirPlay Receiver).`);
      if (port === 5000) {
        logger.info('Attempting fallback to port 5001...');
        startServer(5001);
      } else {
        logger.error(`Failed to bind to port ${port}: ${err.message}`);
        process.exit(1);
      }
    } else {
      logger.error(`Server error: ${err.message}`);
      process.exit(1);
    }
  });

  const shutdown = async () => {
    logger.info('Shutdown signal received. Closing connections...');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
    } catch (dbErr) {
      logger.error('Error closing MongoDB connection:', dbErr);
    }

    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// Connect to database before starting the Express server
const bootstrap = async () => {
  validateProductionEnv();
  await connectDB();
  startServer(config.port);
};

bootstrap();
