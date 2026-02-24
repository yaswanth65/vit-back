import { User, AuthenticationMeta } from '../../database/models/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

/**
 * 1. Login with Email & Password
 * Verifies credentials and returns user with auth metadata
 */
const loginWithPassword = async (email, password) => {
  const user = await User.findOne({
    where: { 
      email: email.toLowerCase().trim(),
      is_active: true 
    },
    include: [{ 
      model: AuthenticationMeta, 
      as: 'authMeta',
      attributes: ['user_id', 'password_hash'] 
    }]
  });

  if (!user || !user.authMeta || !user.authMeta.password_hash) {
    throw new Error('Invalid email or password');
  }

  console.log(user.toJSON());

  // Use bcrypt to compare the raw password with the snake_case hashed field
  const isMatch = await bcrypt.compare(password, user.authMeta.password_hash);
  console.log(password);
  console.log(user.authMeta.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return user;
};

/**
 * 2. Login/Verify with Magic Link
 * Validates the token, ensures it's not expired, and clears it (Single Use)
 */
const verifyMagicLink = async (token) => {
  const authMeta = await AuthenticationMeta.findOne({
    where: {
      magic_link_token: token,
      magic_link_token_expires_at: { [Op.gt]: new Date() }
    },
    include: [{ model: User, as: 'user' }]
  });
  console.log('🔍 Magic Link AuthMeta:', authMeta ? 'Found' : 'Not Found or Expired');

  if (!authMeta || !authMeta.user || !authMeta.user.is_active) {
    throw new Error('Magic link is invalid or has expired');
  }

  // Enforce Single Use: Clear the token immediately after retrieval
  await authMeta.update({
    magic_link_token: null,
    magic_link_token_expires_at: null,
    is_email_verified: true // Successful click proves email ownership
  });

  return authMeta.user;
};

/**
 * 3. Get Current User
 * Returns the user profile without sensitive auth data
 */
const getCurrentUser = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['deactivated_at', 'deactivated_reason'] }
  });

  if (!user || !user.is_active) {
    throw new Error('User not found or account is inactive');
  }

  return user;
};

/**
 * 3. Find User by Email
 * Returns the Used to find user object from email
 */
const findUserByEmail = async (email) => {
  return await User.findOne({
    where: { 
      email: email.toLowerCase().trim(),
      is_active: true 
    }
  });
};

// Inside authService.js
const verifyCurrentPassword = async (userId, plainPassword) => {
  const authMeta = await AuthenticationMeta.findOne({ where: { user_id: userId } });
  if (!authMeta || !authMeta.password_hash) {
    throw new Error('Password record not found');
  }
  
  // Assuming you use bcrypt to compare
  const isMatch = await bcrypt.compare(plainPassword, authMeta.password_hash);
  return isMatch;
};

const updatePassword = async (userId, newPassword) => {
  // 1. Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // 2. Find the AuthenticationMeta record for this user
  const authMeta = await AuthenticationMeta.findOne({ where: { user_id: userId } });
  
  if (!authMeta) {
    throw new Error('Authentication record not found for this user.');
  }

  // 3. Update the password_hash field and clear any existing reset tokens for safety
  await authMeta.update({
    password_hash: hashedPassword,
    password_reset_token: null,
    password_reset_token_expires_at: null
  });

  return true;
};

export default {
  loginWithPassword,
  verifyMagicLink,
  getCurrentUser,
  findUserByEmail,
  updatePassword,
  verifyCurrentPassword
};