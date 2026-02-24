import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@vituor.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'VITUOR Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let transporter = null;

/**
 * Initialize Transporter (SMTP or SendGrid)
 */
async function initializeTransporter() {
  if (transporter) return transporter;

  const config = process.env.EMAIL_SERVICE === 'sendgrid' 
    ? {
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
    }
    : {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    };

  transporter = nodemailer.createTransport(config);
  return transporter;
}

/**
 * Core Send Function
 */
async function sendEmail({ to, subject, html, text }) {
  const transport = await initializeTransporter();
  try {
    const result = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('📧 Email Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Base HTML Template Wrapper
 */
function baseTemplate(content) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #1e40af; text-align: center;">VITUOR</h2>
      <hr />
      ${content}
      <hr />
      <p style="font-size: 12px; color: #666; text-align: center;">
        © ${new Date().getFullYear()} VITUOR Academic Platform.
      </p>
    </div>
  `;
}

// ==================== Specific Service Functions ====================

/**
 * Send Magic Link Email
 */
export async function sendMagicLinkEmail({ email, first_name, token }) {
  const verifyUrl = `${FRONTEND_URL}/api/v1/auth/magic-link/verify?token=${token}`;

  const content = `
    <h3>Hello ${first_name || 'User'},</h3>
    <p>Click the button below to log in securely to your VITUOR account. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="background-color: #1e40af; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Log In to VITUOR
      </a>
    </div>
    <p style="font-size: 12px; color: #999;">If you didn't request this login link, you can safely ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Your VITUOR Magic Login Link',
    html: baseTemplate(content),
    text: `Hello, use this link to log in: ${verifyUrl}`,
  });
}

/**
 * Send OTP Email
 */
export async function sendOTPEmail({ email, otp }) {
  const content = `
    <h3>Verify Your Email</h3>
    <p>Thank you for starting your registration as a Medical Researcher on VITUOR.</p>
    <p>Please use the following 6-digit verification code to complete Step 2:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; border: 1px dashed #1e40af; padding: 10px 20px;">
        ${otp}
      </span>
    </div>
    <p>This code is valid for <strong>15 minutes</strong>. If you did not request this code, please ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Your VITUOR Verification Code',
    html: baseTemplate(content),
    text: `Your VITUOR verification code is: ${otp}`,
  });
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail({ email, first_name, token }) {
  // Point this to your frontend route (e.g., http://localhost:3000/reset-password)
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const content = `
    <h3>Hello ${first_name || 'User'},</h3>
    <p>We received a request to reset your password. Click the button below to choose a new one. This link is valid for <strong>1 hour</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Reset My Password
      </a>
    </div>
    <p style="font-size: 12px; color: #999;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your VITUOR Password',
    html: baseTemplate(content),
    text: `To reset your password, use this link: ${resetUrl}`,
  });
}

/**
 * Send Reviewer Invitation Email
 */
export async function sendReviewerInvitation({ email, first_name, sender_name, token, category, tempPassword }) {
  const acceptUrl = `${FRONTEND_URL}/api/v1/invitations/accept?token=${token}`;

  const content = `
    <h3>Hello Dr. ${first_name},</h3>
    <p><strong>${sender_name}</strong> has invited you to join the VITUOR Academic Platform as a <strong>Reviewer</strong>.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #1e40af;">Your Account Details</h4>
      <p><strong>Assigned Category:</strong> ${category}</p>
      <p><strong>Login Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">${tempPassword}</code></p>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">*You can change this password in your profile settings after logging in.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background-color: #1e40af; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Accept Invitation & Activate Account
      </a>
    </div>
    
    <p style="font-size: 13px; color: #666;">This activation link will expire in 7 days.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Invitation to Review for VITUOR - ${category}`,
    html: baseTemplate(content),
    text: `You have been invited to VITUOR. Use password ${tempPassword} to login after activating here: ${acceptUrl}`,
  });
}

/**
 * Send Editor Invitation Email
 */
/**
 * Send Editor Invitation Email with Credentials
 */
export async function sendEditorInvitation({ 
  email, 
  first_name, 
  sender_name, 
  token, 
  primary_specialty, 
  additional_specialties, 
  message,
  tempPassword 
}) {
  const acceptUrl = `${FRONTEND_URL}/api/v1/invitations/accept-editor?token=${token}`;

  const content = `
    <h3>Hello Dr. ${first_name},</h3>
    <p><strong>${sender_name}</strong> has invited you to join VITUOR as an <b>Editor</b>.</p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
      <p><strong>Message from VITUOR:</strong></p>
      <p><em>"${message || 'We would be honored to have you manage our editorial pipeline.'}"</em></p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #16a34a;">Your Editorial Credentials</h4>
      <p><strong>Primary Specialty:</strong> ${primary_specialty}</p>
      <p><strong>Additional Areas:</strong> ${additional_specialties.join(', ') || 'N/A'}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
      <p><strong>Login Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">${tempPassword}</code></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background-color: #16a34a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Accept & Activate Editorial Account
      </a>
    </div>
    <p style="font-size: 12px; color: #666;">This invitation link will expire in 7 days.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Invitation: Editorial Board at VITUOR - ${primary_specialty}`,
    html: baseTemplate(content),
    text: `You have been invited as an Editor. Login with ${email} and password ${tempPassword} after activating here: ${acceptUrl}`,
  });
}


/**
 * Resend Logic Wrapper
 * Simply re-calls the specific email function needed
 */
// export async function resendEmail(type, data) {
//   switch (type) {
//     case 'MAGIC_LINK':
//       return sendMagicLinkEmail(data);
//     case 'REGISTRATION_OTP':
//       return sendOTPEmail(data);
//     case 'PASSWORD_RESET': // Added this case
//       return sendPasswordResetEmail(data);
//     default:
//       throw new Error('Invalid email resend type');
//   }
// }

export default {
  sendEmail,
  sendMagicLinkEmail,
  sendEditorInvitation,
  sendOTPEmail,
  sendPasswordResetEmail,
};