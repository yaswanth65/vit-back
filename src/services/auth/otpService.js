import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generates a secure 6-digit numeric OTP
 */
const generateOTP = () => {
  // Generates a number between 100000 and 999999
  const otp = crypto.randomInt(100000, 999999).toString();
  // 15 minutes expiry
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return { otp, expiresAt };
};

/**
 * Hashes the OTP using Bcrypt for secure DB storage
 */
const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10); // OTPs are short, 10 rounds is sufficient
  return await bcrypt.hash(otp, salt);
};

/**
 * Verifies if the user-provided OTP matches the hashed version in DB
 */
const verifyOTP = async (rawOtp, hashedOtp) => {
  return await bcrypt.compare(rawOtp, hashedOtp);
};

/**
 * Checks if the OTP has expired
 */
const isExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Checks if a new OTP can be sent (Cooldown check)
 * @param {Date} lastSentAt - The updated_at or invited_at timestamp from the DB
 * @returns {boolean}
 */
const canResend = (lastSentAt) => {
  if (!lastSentAt) return true;
  const cooldownInMs = 60 * 1000; // 1 minute
  const nextAllowedTime = new Date(lastSentAt).getTime() + cooldownInMs;
  return Date.now() > nextAllowedTime;
};

export default {
  generateOTP,
  hashOTP,
  verifyOTP,
  isExpired,
  canResend
};