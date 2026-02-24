/**
 * Test Email Script
 * Sends a test email to verify SMTP configuration
 * Run: node test-email.js
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@vituor.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'VITUOR Platform';
const TEST_EMAIL = 'yaswanth.kancharla65@gmail.com';

async function testEmail() {
  console.log('🧪 Starting Email Test...\n');
  console.log('📧 Configuration:');
  console.log(`   From: "${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`);
  console.log(`   To: ${TEST_EMAIL}`);
  console.log(`   SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`   SMTP User: ${process.env.SMTP_USER}`);
  console.log(`   SMTP Secure: ${process.env.SMTP_SECURE}\n`);

  try {
    // Initialize transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✓ SMTP connection verified!\n');

    // Send test email
    console.log('📨 Sending test email...');
    const result = await transporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: TEST_EMAIL,
      subject: '🧪 VITUOR Test Email - Ignore This',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #154EC2; text-align: center;">VITUOR Test Email</h2>
          <hr />
          <p>This is a test email from your VITUOR backend SMTP configuration.</p>
          <p><strong>✓ If you received this, SMTP is working correctly!</strong></p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <hr />
          <p style="font-size: 12px; color: #666; text-align: center;">
            © 2026 VITUOR Academic Platform
          </p>
        </div>
      `,
      text: 'This is a test email from VITUOR. If you received this, SMTP is working correctly!'
    });

    console.log('✓ Email sent successfully!\n');
    console.log('📬 Message ID:', result.messageId);
    console.log('\n✅ Test Complete! Check your inbox/spam folder.');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Email Test Failed!');
    console.error('Error Details:');
    console.error(error.message);
    console.error('\nCommon Issues:');
    console.error('  1. SMTP credentials are incorrect (.env file)');
    console.error('  2. Gmail app password not used (use app password, not account password)');
    console.error('  3. Less secure app access disabled on Gmail');
    console.error('  4. Network/firewall blocking SMTP port');
    process.exit(1);
  }
}

testEmail();
