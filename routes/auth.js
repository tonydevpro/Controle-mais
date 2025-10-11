const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rotas públicas
router.get('/login', authController.formLogin);
router.post('/login', authController.logar);

router.get('/logout', authController.logout);

router.get('/registrar', authController.formRegistroLoja);
router.post('/registrar', authController.registrarLoja);

// Exibir formulário: solicitar reset (informe email)
router.get('/esqueci-senha', authController.formEsqueciSenha);
router.post('/esqueci-senha', authController.enviarLinkReset);

// Formulário para trocar senha (acessado pelo link com token)
router.get('/resetar-senha', authController.formResetarSenha);
router.post('/resetar-senha', authController.processarResetSenha);
// Rotas privadas podem ser habilitadas futuramente
// router.use(verificarAutenticacao);

module.exports = router;
