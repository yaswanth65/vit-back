/**
 * VITUOR Authentication Module
 * Express Application - App Configuration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import myManuscriptRoutes from './routes/authorRoutes/myManuscriptsRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import reviewerRoutes from './routes/reviewer/reviewerRoutes.js';
import adminRoutes from './routes/adminRoutes/adminRoutes.js';
import authorRoutes from './routes/authorRoutes/authorRoutes.js';
import editorRoutes from './routes/editor/editorRoutes.js';
import eicRoutes from './routes/eic/eicRoutes.js';
import './config/passport.js'; // Initialize Passport OAuth strategies

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// ==================== Security Middleware ====================

// Helmet - Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5173', // Vite default
      process.env.PRODUCTION_FRONTEND_URL || 'https://vituor.vercel.app', // Production frontend
    ].filter(Boolean); // Remove any undefined values

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ==================== Body Parsing ====================

app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ==================== Logging ==================== //

// Morgan HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==================== Session Management ====================

// Session middleware for OAuth (required by Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'vituor-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// ==================== Health Check ====================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VITUOR Auth Service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ==================== API Routes ====================

app.use('/api/v1/author', myManuscriptRoutes);
app.use('/api/v1/author', authorRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/reviewer', reviewerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/editor', editorRoutes);
app.use('/api/v1/eic', eicRoutes);

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'VITUOR Authentication API',
    version: 'v1',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      health: '/health',
    },
  });
});

// ==================== Error Handling ====================

// 404 Handler
app.use((req, res, _next) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      errors: err.errors.map((e) => ({
        field: e.path,
        message: `${e.path} already exists`,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      timestamp: new Date().toISOString(),
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

export default app;
