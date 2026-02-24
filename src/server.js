/**
 * VITUOR Authentication Module
 * Server Entry Point
 */

import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app.js';
import { testConnection,} from './config/database.js';

// Server configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Server instance
let server;

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🚀 Starting VITUOR Authentication Service...');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test database connection
    console.log('📊 Connecting to PostgreSQL database...');
    await testConnection();

    // Sync database models
    // console.log('🔄 Synchronizing database models...');
    // await syncDatabase({ alter: NODE_ENV === 'development' });    

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🚀 VITUOR Authentication Service');
      console.log('───────────────────────────────────────────────────────');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log('═══════════════════════════════════════════════════════\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal) {
  console.log(`\n📴 ${signal} received. Shutting down gracefully...`);

  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('✅ HTTP server closed');
    }

    // Close database connection
    try {
      const { closeConnection } = await import('./config/database.js');
      await closeConnection();
      console.log('✅ Database connection closed');
    } catch (err) {
      console.error('⚠️ Error closing database:', err.message);
    }

    console.log('👋 Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();
