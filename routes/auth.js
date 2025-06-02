const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.formLogin);
router.post('/login', authController.logar);
router.get('/logout', authController.logout);

router.get('/registrar', authController.formRegistro);
router.post('/registrar', authController.registrar);

module.exports = router;