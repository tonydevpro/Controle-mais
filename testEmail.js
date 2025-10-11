// testEmail.js
const { sendMail } = require('./utils/email');

(async () => {
  try {
    await sendMail({
      to: 'seuemail@exemplo.com',
      subject: 'Teste de SMTP Brevo no Railway',
      html: '<h2>Funcionou! 🎉</h2><p>O envio via Brevo está ativo.</p>'
    });
    console.log('Email enviado com sucesso!');
  } catch (err) {
    console.error('Erro ao enviar:', err);
  }
})();
