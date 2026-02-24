import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function sendTestEmail() {
    console.log('--- Starting SMTP Email Test ---');
    console.log(`Sending to: yaswanth.kancharla65@gmail.com`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        // Verify connection configuration
        await transporter.verify();
        console.log('✅ SMTP Connection verified successfully');

        // Send email
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`, // sender address
            to: "yaswanth.kancharla65@gmail.com", // list of receivers
            subject: "VITUOR System Test - SMTP Verification", // Subject line
            text: "This is a test email to verify the SMTP configuration for the VITUOR backend.", // plain text body
            html: "<b>This is a test email</b> to verify the SMTP configuration for the VITUOR backend.", // html body
        });

        console.log("✅ Message sent: %s", info.messageId);
        console.log('--- SMTP Email Test Completed Successfully ---');

    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

sendTestEmail();
