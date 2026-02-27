import authService from '../../services/auth/authService.js';
import tokenService from '../../services/auth/tokenService.js';
import magicLinkService from '../../services/auth/magicLinkService.js';
import { AuthenticationMeta, Editor, User } from '../../database/models/index.js';
import emailService from '../../services/emailService.js';
import { Op } from 'sequelize';

/**
 * Helper to set HttpOnly Refresh Token Cookie
 */
const setTokenCookie = (res, token, expires) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expires,
  });
};

/**
 * 1. Login with Email and Password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verify credentials via service
    const user = await authService.loginWithPassword(email, password);
    
    // Log user role for debugging
    console.log('🔐 User Login:', {
      email: user.email,
      role: user.role,
      userId: user.id
    });

    // Generate tokens
    const tokens = await tokenService.generateAuthTokens(user);

    // Hash the new refresh token and update DB (Enforces Single Session)
    const hashedRefreshToken = await tokenService.hashRefreshToken(tokens.refreshToken);
    await AuthenticationMeta.update(
      { 
        current_refresh_token: hashedRefreshToken,
        refresh_token_expires_at: tokens.refreshExpires,
        last_login: new Date()
      },
      { where: { user_id: user.id } }
    );

    const safeUser = user.toSafeObject();
    console.log('📤 Sending user data:', { role: safeUser.role, email: safeUser.email });

    // Set Cookie and send response
    setTokenCookie(res, tokens.refreshToken, tokens.refreshExpires);
    res.json({
      user: safeUser,
      accessToken: tokens.accessToken
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

/**
 * 2. Request Magic Link
 */
/**
 * Request or Resend Magic Link
 * This single function handles both the initial request and subsequent resends.
 */
const requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1. Find the user
    const user = await authService.findUserByEmail(email);

    // 2. If user exists, generate and store a NEW token (overwrites old one)
    if (user) {
      const { token, expiresAt } = magicLinkService.generateMagicToken();
      
      // Update AuthenticationMeta (snake_case)
      await AuthenticationMeta.update(
        { 
          magic_link_token: token, 
          magic_link_token_expires_at: expiresAt 
        },
        { where: { user_id: user.id } }
      );

      // 3. Send the email using the new emailService
      await emailService.sendMagicLinkEmail({
        email: user.email,
        first_name: user.first_name, // Matches your User model field
        token: token
      });
    }

    /**
     * SECURITY NOTE: 
     * We return a 200 OK even if the email doesn't exist to prevent 
     * "Email Enumeration" (attackers finding out who has an account).
     */
    res.json({ message: 'If an account exists, a magic link has been sent to your email.' });
  } catch (error) {
    console.error('Magic Link Request Error:', error);
    res.status(500).json({ message: 'Internal server error occurred while sending magic link.' });
  }
};



/**
 * 3. Verify Magic Link Login
 */
const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await authService.verifyMagicLink(token);
    console.log('🔍 Magic Link Verified User:', user ? user.email : 'No user found');

    const tokens = await tokenService.generateAuthTokens(user);
    const hashedRefreshToken = await tokenService.hashRefreshToken(tokens.refreshToken);
    console.log(tokens);

    await AuthenticationMeta.update(
      { 
        current_refresh_token: hashedRefreshToken,
        refresh_token_expires_at: tokens.refreshExpires,
        last_login: new Date()
      },
      { where: { user_id: user.id } }
    );

    setTokenCookie(res, tokens.refreshToken, tokens.refreshExpires);
    res.json({
      user: user.toSafeObject(),
      accessToken: tokens.accessToken
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * 4. Refresh Tokens (Keep User Logged In)
 */
const refreshTokens = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    if (!rawRefreshToken) throw new Error('No refresh token provided');

    // In a real middleware, req.user would be set from access token. 
    // Here we might need to find the user by looking at who has this hashed token.
    const authMeta = await AuthenticationMeta.findOne({
      where: { refresh_token_expires_at: { [Op.gt]: new Date() } },
      include: ['user']
    });

    const isValid = await tokenService.verifyRefreshToken(rawRefreshToken, authMeta.current_refresh_token);
    if (!isValid) throw new Error('Invalid session');

    const tokens = await tokenService.generateAuthTokens(authMeta.user);
    const newHashed = await tokenService.hashRefreshToken(tokens.refreshToken);

    await authMeta.update({
      current_refresh_token: newHashed,
      refresh_token_expires_at: tokens.refreshExpires
    });

    setTokenCookie(res, tokens.refreshToken, tokens.refreshExpires);
    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

/**
 * 5. Logout
 */
const logout = async (req, res) => {
  const userId = req.user?.id; // Assuming auth middleware provides this
  if (userId) {
    await AuthenticationMeta.update(
      { current_refresh_token: null, refresh_token_expires_at: null },
      { where: { user_id: userId } }
    );
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

/**
 * 6. Get Current User
 */
const getMe = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user.toSafeObject());
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Request Password Reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await authService.findUserByEmail(email);

    if (user) {
      const { token, expiresAt } = magicLinkService.generateMagicToken();

      // Updated column names to match your DB
      await AuthenticationMeta.update(
        { 
          password_reset_token: token, 
          password_reset_token_expires_at: expiresAt 
        },
        { where: { user_id: user.id } }
      );

      console.log(token);
      await emailService.sendPasswordResetEmail({
        email: user.email,
        first_name: user.first_name,
        token: token
      });
    }
    
    res.json({ message: 'If an account exists, a reset link has been sent to your email.' });
  } catch (error) {
    console.error("DEBUG FORGOT PASSWORD:", error);
    res.status(500).json({ message: 'Error processing password reset request.' });
  }
};

/**
 * Reset Password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Updated column names to match your DB
    const authMeta = await AuthenticationMeta.findOne({
      where: {
        password_reset_token: token,
        password_reset_token_expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!authMeta) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    await authService.updatePassword(authMeta.user_id, newPassword);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 7. Change Password (Authenticated)
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }

    // 1. Verify the current password
    const isMatch = await authService.verifyCurrentPassword(userId, currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'The current password you entered is incorrect.' });
    }

    // 2. Prevent setting the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password.' });
    }

    // 3. Update the password via authService
    // This should handle hashing the new password before saving
    await authService.updatePassword(userId, newPassword);

    // 4. Optional: Clear all other sessions (Security best practice)
    // await AuthenticationMeta.update({ current_refresh_token: null }, { where: { user_id: userId } });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

/**
 * 8. Get Available Categories (Public)
 * Returns all categories that have editors assigned
 */
const getAvailableCategories = async (req, res) => {
  try {
    // Find all active editors with their assigned categories
    const editors = await Editor.findAll({
      attributes: ['assigned_category'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['is_active'],
        where: { is_active: true }
      }],
      where: {
        assigned_category: { [Op.ne]: null }
      }
    });

    // Extract unique categories
    const categories = editors.map(e => e.assigned_category).filter(Boolean);
    
    res.json({
      success: true,
      categories,
      message: 'Available categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

export default {
  login,
  requestMagicLink,
  verifyMagicLink,
  refreshTokens,
  logout,
  getMe,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getAvailableCategories
};