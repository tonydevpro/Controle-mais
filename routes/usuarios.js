const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarAutenticacao, verificarAdmin, verificarPermissao } = require('../middlewares');

// Gerenciar usuários (somente dono/admin com permissão)
router.get(
  '/gerenciar',
  verificarAutenticacao,
  verificarPermissao('usuarios_gerenciar'),
  usuariosController.gerenciarUsuarios
);

// Atualizar tipo/cargo de usuário
router.post(
  '/atualizar-tipo',
  verificarAutenticacao,
  verificarPermissao('usuarios_atualizar_tipo'),
  usuariosController.atualizarTipo
);

module.exports = router;
