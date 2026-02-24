import express from 'express';

import * as manuscriptController from '../../controllers/author/myManuscriptsController.js';

import multer from 'multer';
import { requireAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all routes
router.use(requireAuth);

/**
 * STEP 1 → DETAILS
 */
router.post('/my-manuscripts/draft', manuscriptController.createDraft);
router.put('/my-manuscripts/:id/details', manuscriptController.updateDetails);

/**
 * STEP 2 → AUTHORS
 */
router.put('/my-manuscripts/:id/authors', manuscriptController.updateAuthors);

/**
 * STEP 3 → FILES
 */
router.put(
  '/my-manuscripts/:id/files',
  upload.fields([
    { name: 'main_file', maxCount: 1 },
    { name: 'cover_letter', maxCount: 1 },
    { name: 'supplementary_files', maxCount: 10 }
  ]),
  manuscriptController.uploadFiles
);

router.delete('/my-manuscripts/:id/file', manuscriptController.deleteFile);

/**
 * STEP 4 → REVIEW & SUBMIT
 */
router.put('/my-manuscripts/:id/submit', manuscriptController.submitManuscript);

/**
 * GET
 */
router.get('/my-manuscripts/get-manuscript-by-id/:id', manuscriptController.getManuscriptById);

router.get('/my-manuscripts/get-all-my-manuscripts', manuscriptController.getMyManuscripts);

router.get('/manuscripts/:id/visible-reviews', manuscriptController.getVisibleReviews);
router.post('/manuscripts/:id/submit-revision',
  upload.fields([
    { name: 'main_file', maxCount: 1 },
    { name: 'cover_letter', maxCount: 1 },
    { name: 'supplementary_files', maxCount: 5 }
  ]),
  manuscriptController.submitRevision
);



export default router;
