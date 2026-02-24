import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto'; // Built-in Node module
import dotenv from 'dotenv';

dotenv.config();

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

/**
 * Uses Bcrypt to hash the refresh token for the database
 */
const hashRefreshToken = async (rawToken) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(rawToken, salt);
};

/**
 * Uses Bcrypt to compare the raw cookie token with the DB hash
 */
const verifyRefreshToken = async (rawToken, hashedToken) => {
  return await bcrypt.compare(rawToken, hashedToken);
};


const generateAuthTokens = async (user) => {
  const accessToken = generateAccessToken(user.id, user.role);
  // Generate a secure random string for the user to hold
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  return {
    accessToken,
    refreshToken, // Raw token for the cookie
    accessExpires: new Date(Date.now() + 15 * 60 * 60 * 1000),
    refreshExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
};

export default {
  generateAuthTokens,
  hashRefreshToken,
  verifyRefreshToken,
  generateAccessToken
};