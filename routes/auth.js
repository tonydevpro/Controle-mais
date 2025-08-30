const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rotas públicas
router.get('/login', authController.formLogin);
router.post('/login', authController.logar);

router.get('/logout', authController.logout);

router.get('/registrar', authController.formRegistroLoja);
router.post('/registrar', authController.registrarLoja);

// Rotas privadas podem ser habilitadas futuramente
// router.use(verificarAutenticacao);

module.exports = router;
