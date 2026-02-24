import express from 'express';
const router = express.Router();
import { getBillingProfile, updateBillingProfile, getAuthorProfile, updateAuthorProfile, deleteProfileImage, deactivateSelf} from '../../controllers/author/authorController.js';
import { requireAuth, requireRole } from '../../middlewares/authMiddleware.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });


router.get('/profile', requireAuth, requireRole('Author'), getAuthorProfile);

router.put('/update-profile', requireAuth, requireRole('Author'), upload.single('profile_image'), updateAuthorProfile);

// DELETE: Remove image only
router.delete('/delete-image', requireAuth, deleteProfileImage);

// Get and Update billing details
router.get('/billing', requireAuth, requireRole('Author'), getBillingProfile);
router.put('/billing', requireAuth, requireRole('Author'), updateBillingProfile);

router.put('/deactivate', requireAuth, requireRole('Author'), deactivateSelf);

export default router;