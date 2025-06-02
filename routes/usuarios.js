const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const autenticarUsuario = require('../middlewares/autenticacao');
const verificarAdmin = require('../middlewares/verificarAdmin');

router.get('/gerenciar', autenticarUsuario, verificarAdmin, usuariosController.gerenciarUsuarios);
router.post('/atualizar-tipo', autenticarUsuario, verificarAdmin, usuariosController.atualizarTipo);

module.exports = router;
