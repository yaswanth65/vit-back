import { User, AuthenticationMeta} from '../../database/models/index.js';
import otpService from './otpService.js';
import emailService from '../emailService.js';

/**
 * Handles generating, hashing, and sending OTP
 * Used for both initial registration and resends
 * @param {string} email - User email
 * @param {boolean} isResend - Whether this is a resend request (applies cooldown)
 */
export const requestRegistrationOTP = async (email, isResend = false) => {
  const authMeta = await AuthenticationMeta.findOne({
    include: [{ 
      model: User,
      as: 'user',
      where: { email: email.toLowerCase().trim(), is_active: false }
    }]
  });

  if (!authMeta) {
    throw new Error('Registration not found or already completed.');
  }

  // Cooldown check (1 minute) - ONLY for resend requests
  if (isResend && !otpService.canResend(authMeta.updatedAt)) {
    throw new Error('Please wait 1 minute before requesting a new code.');
  }

  // 1. Generate new OTP
  const { otp, expiresAt } = otpService.generateOTP();
  const hashedOtp = await otpService.hashOTP(otp);

  // 2. Update Database (updated_at will auto-update)
  await authMeta.update({
    registration_otp: hashedOtp,
    registration_otp_expires_at: expiresAt
  });

  // 3. Send via Email Service
  await emailService.sendOTPEmail({ email, otp });

  return true;
};

/**
 * Logic to verify the provided OTP (Service Layer)
 */
const verifyRegistrationOTP = async (email, rawOtp) => {
  // Find the metadata linked to the inactive user
  const authMeta = await AuthenticationMeta.findOne({
    include: [{ 
      model: User,
      as: 'user',
      where: { email: email.toLowerCase().trim(), is_active: false } 
    }]
  });

  if (!authMeta) {
    throw new Error('Registration session not found or already verified.');
  }

  // 1. Check Expiry
  if (otpService.isExpired(authMeta.registration_otp_expires_at)) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // 2. Compare Hashes
  const isValid = await otpService.verifyOTP(rawOtp, authMeta.registration_otp);
  if (!isValid) {
    throw new Error('Incorrect verification code.');
  }

  // 3. Update status to proceed to Step 3
  await authMeta.update({
    is_registration_verified: true,
    registration_step: '3',
    registration_otp: null, 
    registration_otp_expires_at: null
  });

  return true;
};

//================== Verification Function of SSO, Scholar and ORCID =======================

export default {
  requestRegistrationOTP,
  verifyRegistrationOTP
};