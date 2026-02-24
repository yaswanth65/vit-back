import crypto from 'crypto';
import { AuthenticationMeta } from '../../database/models/index.js';
import { Op } from 'sequelize';

/**
 * Generates a secure random token and its expiry
 */
const generateMagicToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  // Set expiry for 15 minutes from now
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return { token, expiresAt };
};

/**
 * Logic to find and validate a token
 */
const validateMagicToken = async (token) => {
  const authMeta = await AuthenticationMeta.findOne({
    where: {
      magic_link_token: token,
      magic_link_token_expires_at: {
        [Op.gt]: new Date(), // Must be greater than current time
      },
    },
  });

  return authMeta;
};

export default {
  generateMagicToken,
  validateMagicToken,
};