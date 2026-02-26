import express from 'express';
import passport from 'passport';
import authController from '../../controllers/auth/authController.js';
import registerController from '../../controllers/auth/registerController.js';
import { requireAuth } from '../../middlewares/authMiddleware.js'; // You'll need to create this


const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Traditional Login
router.post('/login', authController.login);

// Get Available Categories (for manuscript submission - public route)
router.get('/categories', authController.getAvailableCategories);

// Magic Link Flow
router.post('/magic-link/request', authController.requestMagicLink);
router.get('/magic-link/verify', authController.verifyMagicLink);

// Token Refresh (To keep user logged in after page refresh)
router.post('/refresh-tokens', authController.refreshTokens);


// ==================== PROTECTED ROUTES FOR AUTHOR ====================
// These routes require a valid JWT Access Token

// Get Current Logged-in User
router.get('/me', requireAuth, authController.getMe);

// Logout (Invalidates session in DB)
router.post('/logout', requireAuth, authController.logout);

// Password Reset Flow
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

router.post('/change-password', requireAuth, authController.changePassword);

// ==================== Step 0: External Verification ====================
router.get('/orcid', passport.authenticate('orcid', { scope: '/read-public' }));
router.get('/orcid/callback', 
  passport.authenticate('orcid', { session: false }), 
  registerController.orcidCallback
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false }), 
  registerController.googleScholarCallback
);

// --- Institutional SSO (SAML) ---
// Note: SAML requires a bit more config for the 'entryPoint'
router.get('/sso', passport.authenticate('saml'));

// Callback: Institution POSTs data back here
router.post('/sso/callback', 
  passport.authenticate('saml', { session: false, failureRedirect: '/login' }),
  registerController.ssoCallback
);


// ==================== Step 1 - 3: Main Registration ====================
router.post('/register/step-1', registerController.registerStepOne);
router.post('/register/verify-otp', registerController.verifyOTP);
router.post('/register/resend-otp', registerController.resendOTP);
router.post('/register/finalize', registerController.finalizeRegistration);

export default router;