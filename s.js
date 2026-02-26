import nodemailer from "nodemailer";

// Hostinger SMTP Configuration
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "admin@artgram.in",
    pass: "Artgram@2025"
  }
});

// Verify SMTP Connection
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("Server is ready to send emails");
  }
});

// Send test email
async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"ArtGram" <admin@artgram.in>',
      to: "artgramwalkin@gmail.com",
      subject: "Test Email from Hostinger",
      text: "This is a test email sent via Hostinger SMTP",
      html: "<b>This is a test email sent via Hostinger SMTP</b>"
    });

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

sendTestEmail();