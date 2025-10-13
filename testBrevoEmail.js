// testBrevoEmail.js
require('dotenv').config();
const { sendMail } = require('./utils/email');

async function testarEmail() {
  try {
    const info = await sendMail({
      to: 'chronos.virtual1@gmail.com', // substitua pelo seu email
      subject: 'Teste de envio - Brevo API',
      html: `<p>Olá! Este é um teste de envio de email via <strong>Brevo API</strong>.</p>`,
      text: 'Olá! Este é um teste de envio de email via Brevo API.'
    });

    console.log('✅ Email enviado com sucesso:', info);
  } catch (error) {
    console.error('❌ Falha ao enviar email:', error.message);
  }
}

testarEmail();
