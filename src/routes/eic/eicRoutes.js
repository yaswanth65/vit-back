import express from 'express';
import {
    getPendingManuscripts,
    getAllManuscripts,
    getManuscriptDetails,
    getManuscriptReviews,
    getEditorDecision,
    makeFinalDecision,
    sendForRevision,
    updateReviewerLimit,
    getAllReviewers,
    getDashboardStats,
    getManuscriptAuditTrail
} from '../../controllers/eic/eicController.js';
import { requireAuth, requireRole } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication and Editor-in-Chief role
router.use(requireAuth);
router.use(requireRole('EditorInChief'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Manuscript management
router.get('/manuscripts/pending', getPendingManuscripts);
router.get('/manuscripts', getAllManuscripts);
router.get('/manuscripts/:id', getManuscriptDetails);
router.get('/manuscripts/:id/reviews', getManuscriptReviews);
router.get('/manuscripts/:id/editor-decision', getEditorDecision);
router.get('/manuscripts/:id/audit-trail', getManuscriptAuditTrail);

// Decision making
router.post('/manuscripts/:id/final-decision', makeFinalDecision);
router.post('/manuscripts/:id/send-revision', sendForRevision);
router.put('/manuscripts/:id/reviewer-limit', updateReviewerLimit);

// Reviewer management
router.get('/reviewers', getAllReviewers);

export default router;