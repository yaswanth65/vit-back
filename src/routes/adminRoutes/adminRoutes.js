import express from 'express';

import {
  getAllSupportTickets,
  updateSupportTicketStatus,
  deactivateUser,
  reactivateUser
} from '../../controllers/admin/adminController.js';

import { getSupportTicketById } from '../../controllers/supportController.js';

import { requireAuth, requireRole } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Admin views all tickets
router.get(
  '/support-tickets',
  requireAuth,
  requireRole('Admin'),
  getAllSupportTickets
);

// Admin views single ticket
router.get(
  '/support-tickets/:id',
  requireAuth,
  requireRole('Admin'),
  getSupportTicketById
);

// Admin updates ticket
router.patch(
  '/support-tickets/:id',
  requireAuth,
  requireRole('Admin'),
  updateSupportTicketStatus
);

// User Management
router.patch(
  '/users/:id/deactivate',
  requireAuth,
  requireRole('Admin'),
  deactivateUser
);

router.patch(
  '/users/:id/reactivate',
  requireAuth,
  requireRole('Admin'),
  reactivateUser
);

export default router;
