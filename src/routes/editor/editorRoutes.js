import express from 'express';
import * as editorController from '../../controllers/editor/manuscriptController.js';
import { requireAuth, requireRole } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('Editor'));

// ==================== MANUSCRIPT MANAGEMENT ====================
// GET manuscripts with pagination, search, and filtering
router.get('/manuscripts', editorController.getManuscripts);

// GET specific manuscript details
router.get('/manuscripts/:id', editorController.getManuscriptsById);

// Submit/Handover manuscript to Editor-in-Chief (EIC)
router.put('/manuscripts/:id/handover-eic', editorController.handlingManuscriptToEIC);

router.post('/manuscripts/:id/submit-to-eic', editorController.submitToEIC);

// ==================== REVIEWER MANAGEMENT ====================
// GET all reviewers with category matching, search, and pagination
router.get('/reviewers', editorController.getAllReviewers);

// GET specific reviewer profile
router.get('/reviewers/:id', editorController.getReviewerById);

// Assign a single reviewer to a manuscript
router.post('/assignments/single', editorController.assignReviewer);

// Assign multiple reviewers in one request
router.post('/assignments/bulk', editorController.assignReviewersInBulk);


// ==================== ISSUE & PUBLICATION ====================
// Create a new journal issue
router.post('/issues', editorController.createIssue);

// Download metadata for a specific issue
router.get('/issues/:id/download-metadata', editorController.downloadIssueMetaData);

export default router;