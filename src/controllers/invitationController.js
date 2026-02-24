import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  User,
  AuthenticationMeta,
  Reviewer,
  Editor,
} from '../database/models/index.js';
import {
  sendReviewerInvitation,
  sendEditorInvitation,
} from '../services/emailService.js';
import sequelize from 'sequelize';

//===============Functions created for Reviewer==========================//
/**
 * SEND: Create user and send first invitation
 */
export const inviteReviewer = async (req, res) => {
  let newUser = null;

  try {
    const { email, first_name, last_name, category, temp_password } = req.body;

    const sender = req.user;

    // Check if exists
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    // 1. Create User
    newUser = await User.create({
      first_name,
      last_name,
      email,
      role: 'Reviewer',
      is_active: false,
    });

    // 2. Create AuthenticationMeta
    const invitationToken = crypto.randomBytes(32).toString('hex');

    const hashedPassword = await bcrypt.hash(temp_password, 12);

    await AuthenticationMeta.create({
      user_id: newUser.id,
      password_hash: hashedPassword,
      invitation_token: invitationToken,
      invitation_token_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
      invited_by: sender.id,
      invited_at: new Date(),
    });

    // 3. Create Reviewer profile
    // IMPORTANT: explicitly set id
    await Reviewer.create({
      id: newUser.id, // REQUIRED because no defaultValue
      user_id: newUser.id,

      assigned_category: category,
      availability_status: 'Unavailable',
    });

    // 4. Send invitation email
    await sendReviewerInvitation({
      email,
      first_name,
      sender_name: `${sender.first_name} ${sender.last_name}`,
      token: invitationToken,
      category,
      tempPassword: temp_password,
    });

    return res.status(201).json({
      success: true,
      message: 'Reviewer invited successfully',
    });
  } catch (error) {
    console.error(error);

    // Manual rollback
    if (newUser) {
      await Reviewer.destroy({
        where: { id: newUser.id },
      });

      await AuthenticationMeta.destroy({
        where: { user_id: newUser.id },
      });

      await User.destroy({
        where: { id: newUser.id },
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * RESEND: Triggered by Admin/Editor for existing inactive users
 */
export const resendInvitation = async (req, res) => {
  try {
    const { email, temp_password } = req.body;
    const sender = req.user;

    // 1. Find reviewer
    const user = await User.findOne({
      where: { email, role: 'Reviewer' },
      include: [{ model: AuthenticationMeta, as: 'authMeta' }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Reviewer not found',
      });
    }

    // 2. Prevent resend if already active
    if (user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Reviewer is already active',
      });
    }

    // 3. Require new temp password
    if (!temp_password) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password is required for resend',
      });
    }

    // 4. Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');

    // 5. Hash new temp password
    const hashedPassword = await bcrypt.hash(temp_password, 12);

    // 6. Update auth meta
    const authMeta = user.authMeta;

    authMeta.password_hash = hashedPassword;
    authMeta.invitation_token = newToken;
    authMeta.invitation_token_expires_at = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    authMeta.invited_by = sender.id;
    authMeta.invited_at = new Date();

    await authMeta.save();

    // 7. Get reviewer category
    const reviewer = await Reviewer.findOne({
      where: { user_id: user.id },
    });

    // 8. Send SAME email function
    await sendReviewerInvitation({
      email: user.email,
      first_name: user.first_name,
      sender_name: `${sender.first_name} ${sender.last_name}`,
      token: newToken,
      category: reviewer.assigned_category,
      tempPassword: temp_password,
    });

    console.log(newToken);

    return res.status(200).json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * STATUS: List all invitations for the dashboard
 */
export const getInvitationStatus = async (req, res) => {
  try {
    const reviewers = await User.findAll({
      where: { role: 'Reviewer' },
      attributes: ['id', 'email', 'first_name', 'last_name', 'is_active'],
      include: [
        {
          model: AuthenticationMeta,
          as: 'authMeta',
          attributes: [
            'invited_at',
            'invited_by',
            'invitation_token_expires_at',
          ],
        },
        {
          model: Reviewer,
          as: 'reviewerProfile',
          attributes: ['assigned_category'],
        },
      ],
      order: [
        [{ model: AuthenticationMeta, as: 'authMeta' }, 'invited_at', 'DESC'],
      ],
    });

    res.json({
      count: reviewers.length,
      data: reviewers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ACCEPT: Public flow for Reviewer to set password and activate
 */
export const handleAcceptInvitation = async (req, res) => {
  try {
    const { token } = req.query;

    const authMeta = await AuthenticationMeta.findOne({
      where: { invitation_token: token },
      include: [{ model: User, as: 'user' }],
    });

    if (!authMeta || authMeta.invitation_token_expires_at < new Date()) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired invitation token' });
    }

    const user = authMeta.user;

    // 1. Activate Account
    user.is_active = true;
    await user.save();

    // 2. Cleanup
    authMeta.invitation_token = null;
    authMeta.invitation_token_expires_at = null;
    authMeta.is_email_verified = true;
    await authMeta.save();

    // 3. Redirect / Success Response
    // If this is an API call, return the login URL for the frontend to handle
    res.json({
      message: 'Account activated successfully!',
      redirectUrl: `${FRONTEND_URL}/login`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//==================Functions created for Editor==========================//

export const inviteEditor = async (req, res) => {
  let newUser = null;

  try {
    const {
      email,
      first_name,
      last_name,
      primary_specialty,
      additional_specialties,
      message,
      temp_password,
    } = req.body;

    const sender = req.user;

    // 1. Check if user exists
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // 2. Create User
    newUser = await User.create({
      first_name,
      last_name,
      email,
      role: 'Editor',
      is_active: false,

      // Store specialties in User model
      specialties: additional_specialties || [],
    });

    // 3. Generate invitation token + password hash
    const invitationToken = crypto.randomBytes(32).toString('hex');

    const hashedPassword = await bcrypt.hash(temp_password, 12);

    // 4. Create AuthenticationMeta
    await AuthenticationMeta.create({
      user_id: newUser.id,

      password_hash: hashedPassword,

      invitation_token: invitationToken,

      invitation_token_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),

      invited_by: sender.id,

      invited_at: new Date(),

      is_email_verified: false,
    });

    // 5. Create Editor profile (UPDATED TO MATCH YOUR MODEL)
    await Editor.create({
      id: newUser.id, // Explicitly set ID to match User
      user_id: newUser.id,

      // Required unique domain responsibility
      assigned_category: primary_specialty,

      // Store primary specialty explicitly
      primary_specialty: primary_specialty,

      // Store additional specialties
      additional_specialties: additional_specialties || [],
    });

    // 6. Send invitation email (UNCHANGED STRUCTURE)
    await sendEditorInvitation({
      email,
      first_name,
      sender_name: `${sender.first_name} ${sender.last_name}`,
      token: invitationToken,
      primary_specialty,
      additional_specialties,
      message,
      tempPassword: temp_password,
    });

    return res.status(201).json({
      success: true,

      message: 'Editor invited successfully',
    });
  } catch (error) {
    console.error(error);

    // Manual rollback
    if (newUser) {
      await Editor.destroy({
        where: { user_id: newUser.id },
      });

      await AuthenticationMeta.destroy({
        where: { user_id: newUser.id },
      });

      await User.destroy({
        where: { id: newUser.id },
      });
    }

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

export const resendEditorInvitation = async (req, res) => {
  try {
    const {
      email,
      primary_specialty,
      additional_specialties,
      message,
      temp_password,
    } = req.body;

    const sender = req.user;

    // Find Editor user
    const user = await User.findOne({
      where: {
        email,
        role: 'Editor',
      },

      include: [
        {
          model: AuthenticationMeta,
          as: 'authMeta',
        },
        {
          model: Editor,
          as: 'editorProfile',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Editor not found',
      });
    }

    if (user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Editor is already active',
      });
    }

    if (!temp_password) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password required',
      });
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');

    const hashedPassword = await bcrypt.hash(temp_password, 12);

    // Update AuthenticationMeta
    const authMeta = user.authMeta;

    authMeta.password_hash = hashedPassword;

    authMeta.invitation_token = newToken;

    authMeta.invitation_token_expires_at = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    authMeta.invited_by = sender.id;

    authMeta.invited_at = new Date();

    await authMeta.save();

    // Send invitation email (EXACT SAME STRUCTURE)
    await sendEditorInvitation({
      email: user.email,

      first_name: user.first_name,

      sender_name: `${sender.first_name} ${sender.last_name}`,

      token: newToken,

      primary_specialty:
        primary_specialty || user.editorProfile.assigned_category,

      additional_specialties: additional_specialties || user.specialties,

      message,

      tempPassword: temp_password,
    });

    return res.status(200).json({
      success: true,
      message: 'Editor invitation resent successfully',
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/**
 * Handle Editor Accept
 */
export const handleEditorAccept = async (req, res) => {
  try {
    const { token } = req.query;

    const authMeta = await AuthenticationMeta.findOne({
      where: { invitation_token: token },
      include: [{ model: User, as: 'user' }],
    });

    if (!authMeta || authMeta.invitation_token_expires_at < new Date()) {
      return res
        .status(400)
        .json({ message: 'This invitation link has expired or is invalid.' });
    }

    const user = authMeta.user;

    // 1. Activate the Editor
    user.is_active = true;
    await user.save();

    // 2. Cleanup invitation tokens
    authMeta.invitation_token = null;
    authMeta.invitation_token_expires_at = null;
    authMeta.is_email_verified = true;
    await authMeta.save();

    // 3. Respond with redirect info
    res.json({
      message: 'Editorial account activated successfully! You can now log in.',
      redirectUrl: `${FRONTEND_URL}/login`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
