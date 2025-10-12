require('dotenv').config();
const { sendMail } = require('./utils/email');

(async () => {
  try {
    await sendMail({
      to: 'seuemail@gmail.com',
      subject: 'Teste via Brevo API 🚀',
      html: '<h2>Envio funcionando via API Brevo!</h2>'
    });
    console.log('✅ Email enviado com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
})();
// Para rodar: node testEmail.js
