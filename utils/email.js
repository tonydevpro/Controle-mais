// ARQUIVO: utils/email.js (VERSÃO ROBUSTA)
// ============================================

const axios = require('axios');

async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'suporte.loges@gmail.com';
  const fromName = process.env.FROM_NAME || 'Controle+';

  console.log(`\n📧 [EMAIL] Tentando enviar para: ${to}`);

  // ❌ Se não tiver chave, falha graciosamente
  if (!apiKey) {
    console.error('❌ [EMAIL] BREVO_API_KEY não configurada');
    const erro = new Error(
      'Servidor de email não configurado. Contate o administrador.'
    );
    throw erro;
  }

  try {
    console.log(`📤 [EMAIL] Enviando via Brevo...`);
    
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey.trim()
        },
        timeout: 10000
      }
    );

    console.log(`✅ [EMAIL] Enviado com sucesso! ID: ${response.data.messageId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ [EMAIL] Erro: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

module.exports = { sendMail };