import { User, AuthenticationMeta} from '../../database/models/index.js';
import otpService from './otpService.js';
import emailService from '../emailService.js';

/**
 * Handles generating, hashing, and sending OTP
 * Used for both initial registration and resends
 */
export const requestRegistrationOTP = async (email) => {
  const authMeta = await AuthenticationMeta.findOne({
    include: [{ 
      model: User,
      as: 'user', // Required alias
      where: { email, is_active: false } // Only for accounts in progress
    }]
  });

  if (!authMeta) {
    throw new Error('Registration not found or already completed.');
  }

  // Cooldown check (1 minute)
  if (!otpService.canResend(authMeta.updated_at)) {
    throw new Error('Please wait 1 minute before requesting a new code.');
  }

  // 1. Generate new OTP
  const { otp, expiresAt } = otpService.generateOTP();
  const hashedOtp = await otpService.hashOTP(otp);

  // 2. Update Database
  await authMeta.update({
    registration_otp: hashedOtp,
    registration_otp_expires_at: expiresAt
  });

  // 3. Send via Email Service
  await emailService.sendOTPEmail({ email, otp });

  return true;
};

/**
 * Logic to verify the provided OTP
 */
/**
 * Logic to verify the provided OTP (Service Layer)
 */
const verifyRegistrationOTP = async (email, rawOtp) => {
  // Find the metadata linked to the inactive user
  const authMeta = await AuthenticationMeta.findOne({
    include: [{ 
      model: User,
      as: 'user', // Required alias
      where: { email, is_active: false } 
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