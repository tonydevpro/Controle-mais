// ARQUIVO: utils/email.js (COM DEBUG COMPLETO)
// ============================================

const axios = require('axios');

async function sendMail({ to, subject, html, text }) {
  console.log('\n📧 [EMAIL] Iniciando envio...');
  
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'suporte.loges@gmail.com';
  const fromName = process.env.FROM_NAME || 'Controle+';

  // DEBUG DETALHADO
  console.log('🔍 [EMAIL DEBUG]');
  console.log(`   ├─ BREVO_API_KEY definida: ${!!apiKey}`);
  if (apiKey) {
    console.log(`   ├─ Tamanho da chave: ${apiKey.length} caracteres`);
    console.log(`   ├─ Primeiros 15 chars: ${apiKey.substring(0, 15)}`);
  }
  console.log(`   ├─ From Email: ${fromEmail}`);
  console.log(`   ├─ From Name: ${fromName}`);
  console.log(`   └─ Destinatário: ${to}`);

  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    console.error('\n❌ [EMAIL ERRO] BREVO_API_KEY não definida ou vazia!');
    console.error('   Valor:', JSON.stringify(process.env.SENDGRID_API_KEY));
    console.error('   Type:', typeof process.env.SENDGRID_API_KEY);
    
    const erro = new Error('BREVO_API_KEY não configurada nas variáveis de ambiente');
    throw erro;
  }

  const payload = {
    sender: {
      name: fromName,
      email: fromEmail
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text
  };

  const config = {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey.trim() // ← Remove espaços extras
    },
    timeout: 10000
  };

  console.log('📤 [EMAIL] Enviando requisição...');
  console.log(`   ├─ URL: https://api.brevo.com/v3/smtp/email`);
  console.log(`   ├─ Headers api-key definida: ${!!config.headers['api-key']}`);
  console.log(`   └─ Payload tamanho: ${JSON.stringify(payload).length} bytes`);

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      config
    );

    console.log(`✅ [EMAIL] Email enviado com sucesso!`);
    console.log(`   └─ Message ID: ${response.data.messageId}`);
    return response.data;
    
  } catch (error) {
    console.error('\n❌ [EMAIL ERRO] Falha ao enviar email');
    console.error('━'.repeat(60));
    console.error(`Status HTTP: ${error.response?.status}`);
    console.error(`Mensagem Brevo: ${error.response?.data?.message}`);
    console.error(`Código erro: ${error.response?.data?.code}`);
    console.error(`URL requisição: ${error.config?.url}`);
    console.error(`\nHeaders enviados:`);
    console.error(`  - api-key: ${error.config?.headers['api-key'] ? 'SIM' : 'NÃO DEFINIDA'}`);
    console.error(`  - Content-Type: ${error.config?.headers['Content-Type']}`);
    console.error(`\nErro completo:`, error.message);
    console.error('━'.repeat(60) + '\n');
    
    throw error;
  }
}

module.exports = { sendMail };