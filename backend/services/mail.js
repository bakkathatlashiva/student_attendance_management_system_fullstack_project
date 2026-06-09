const nodemailer = require('nodemailer');

const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

let transporter = null;
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
    console.log('Nodemailer SMTP service configured.');
  } catch (err) {
    console.error('Failed to configure Nodemailer:', err.message);
  }
}

async function sendMail({ to, subject, html, text }) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'College ERP Portal'}" <${EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (err) {
      console.error('SMTP Email sending failed:', err.message);
    }
  }

  // Fallback Mock Log
  console.log(`\n=================== [MAIL MOCK SERVICE] ===================`);
  console.log(`TO:      ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text || 'HTML Content Supplied'}`);
  console.log(`===========================================================\n`);
  return { mockId: `mock-email-${Date.now()}` };
}

module.exports = {
  sendMail
};
