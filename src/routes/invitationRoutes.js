import express from 'express';
const router = express.Router();

// Import all functions from your invitationController
import { 
  inviteReviewer, 
  resendInvitation, 
  getInvitationStatus, 
  handleAcceptInvitation,
  inviteEditor,
  handleEditorAccept,
  resendEditorInvitation
} from '../controllers/invitationController.js';

// Import your auth middleware
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

/**
 * ==========================================
 * PUBLIC ROUTES
 * ==========================================
 * These are triggered when a user clicks a link 
 * in their email. No Bearer token required.
 */

// Reviewer clicks 'Accept'
router.post('/reviewer-accept', handleAcceptInvitation);

// Editor clicks 'Accept'
router.post('/editor-accept', handleEditorAccept);


/**
 * ==========================================
 * PROTECTED ROUTES
 * ==========================================
 * These require the sender to be logged in 
 * and have the appropriate permissions.
 */



// --- Reviewer Management ---
// Only Admin and Editors can invite/resend reviewers
router.post('/reviewer-invite',requireAuth, requireRole('Admin', 'Editor', 'EditorInChief'), inviteReviewer);
router.post('/reviewer-resend', requireAuth, requireRole('Admin', 'Editor', 'EditorInChief'), resendInvitation);
router.get('/status', requireAuth, requireRole('Admin', 'Editor', 'EditorInChief'), getInvitationStatus);


// --- Editor Management ---
// Usually, only an Admin or EditorInChief can invite other Editors
router.post('/editor-invite', requireAuth, requireRole('Admin', 'EditorInChief'), inviteEditor);

router.post('/editor-resend', requireAuth, requireRole('Admin', 'Editor', 'EditorInChief'), resendEditorInvitation);



export default router;