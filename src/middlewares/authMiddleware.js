import jwt from 'jsonwebtoken';
import { User } from '../database/models/index.js';


/**
 * AUTHENTICATION MIDDLEWARE
 * Verifies JWT and attaches user to req.user
 */
export const requireAuth = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.sub);

    if (!user || !user.is_active) {
      return res.status(401).json({
        message: 'User not found or account deactivated.',
      });
    }

    // attach user
    req.user = user;

    next();

  } catch (error) {
    console.error('Auth Middleware Error:', error.message);

    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
};



/**
 * ROLE AUTHORIZATION MIDDLEWARE
 * Example: requireRole('admin')
 * Example: requireRole('reviewer')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {

      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: 'Access forbidden: insufficient permissions',
        });
      }

      next();

    } catch (error) {
      console.error('Role Middleware Error:', error.message);

      return res.status(500).json({
        message: 'Authorization error',
      });
    }
  };
};


export default {requireAuth, requireRole};