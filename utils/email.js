// utils/email.js
console.log('Usando chave Brevo:', process.env.BREVO_API_KEY);

const axios = require('axios');

async function sendMail({ to, subject, html, text }) {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.FROM_NAME || 'Controle+',
          email: process.env.FROM_EMAIL || 'suporte.loges@gmail.com'
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text
      },
      {
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    console.log('✅ Email enviado com sucesso:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar email via Brevo API:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendMail };
