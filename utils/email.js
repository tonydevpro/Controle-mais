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
} else {
  throw new Error('EMAIL_PROVIDER inválido. Use gmail ou outlook.');
}

async function sendMail({ to, subject, html, text }) {
  const from = `${process.env.FROM_EMAIL_CONTROLE || process.env.GMAIL_USER} `;
  const info = await transporter.sendMail({
    from: `"Controle+" <${process.env.FROM_EMAIL_CONTROLE || (provider === 'gmail' ? process.env.GMAIL_USER : process.env.OUTLOOK_USER)}>`,
    to,
    subject,
    text,
    html
  });
  return info;
}

module.exports = { sendMail };
