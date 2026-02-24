import express from 'express';
import * as reviewerController from '../../controllers/reviewer/reviewerController.js';
import { requireAuth, requireRole } from '../../middlewares/authMiddleware.js';
import { getSupportTicketById } from '../../controllers/supportController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET assigned manuscripts
router.get(
  '/assignments',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.getAssignedManuscripts
);

// accept review
router.put(
  '/assignments/:id/accept',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.acceptReviewAssignment
);

// reject review
router.put(
  '/assignments/:id/reject',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.rejectReviewAssignment
);

// to get a specific review 
router.get(
  '/:reviewId/comments',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.getReviewComments
);

//to add comment
router.post(
  '/:reviewId/comments',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.addComment
);

//to update comments
router.put(
  '/comment/:id',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.updateComment
);

//remove a comment
router.delete(
  '/comment/:id',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.deleteComment
);


router.get(
  '/assignment/:assignId',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.getMyReview
);
router.put(
  '/review/:reviewId',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.updateReviewScores
);
router.put(
  '/review/:reviewId/submit',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.submitReview
);

// Reviewer raises ticket
router.post(
  '/support-tickets',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.raiseSupportTicket
);

// Reviewer views own tickets
router.get(
  '/support-tickets',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.getMySupportTickets
);

// Reviewer views single ticket
router.get(
  '/support-tickets/:id',
  requireAuth,
  requireRole('Reviewer'),
  getSupportTicketById
);

router.get(
  '/profile',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.getMyProfile
);

// Handles both text and the 'profile_image' file
router.put(
  '/profile',
  requireAuth,
  requireRole('Reviewer'),
  upload.single('profile_image'),
  reviewerController.updateProfile
);

// Separate endpoint just for removing the photo
router.delete(
  '/image',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.deleteReviewerImage
);

/**
 * @route   GET /api/reviewer/preferences
 * @desc    Fetch specific expertise and workload settings
 * @access  Private (Reviewer only)
 */
router.get(
  '/preferences',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.fetchReviewPreferences
);

/**
 * @route   PUT /api/reviewer/preferences
 * @desc    Update tags and workload constraints
 * @access  Private (Reviewer only)
 */
router.put(
  '/preferences',
  requireAuth,
  requireRole('Reviewer'),
  reviewerController.updateReviewPreferences
);

export default router;
