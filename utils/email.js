// utils/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const provider = process.env.EMAIL_PROVIDER || 'gmail';

let transporter;

if (provider === 'gmail') {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
} else if (provider === 'outlook') {
  transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_USER,
      pass: process.env.OUTLOOK_PASSWORD
    },
    tls: { ciphers: 'SSLv3' }
  });
} else if (provider === 'brevo') {
  transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS
    }
  });
} else {
  throw new Error('EMAIL_PROVIDER inválido. Use gmail, outlook ou brevo.');
}

async function sendMail({ to, subject, html, text }) {
  const from = `"${process.env.FROM_NAME || 'Controle+'}" <${process.env.FROM_EMAIL || process.env.GMAIL_USER || process.env.OUTLOOK_USER || process.env.BREVO_USER}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  console.log('✅ Email enviado:', info.messageId);
  return info;
}

module.exports = { sendMail };
