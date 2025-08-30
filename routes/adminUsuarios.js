const express = require('express');
const router = express.Router();
const adminUsuariosController = require('../controllers/adminUsuariosController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// 🔹 Middleware global: autenticação
router.use(verificarAutenticacao);

// 🔹 Rotas de usuários com permissões específicas
router.get('/', verificarPermissao('usuarios_ver'), adminUsuariosController.listarUsuarios);
router.get('/novo', verificarPermissao('usuarios_cadastrar'), adminUsuariosController.formNovoUsuario);
router.post('/novo', verificarPermissao('usuarios_cadastrar'), adminUsuariosController.criarUsuario);
router.get('/:id/editar', verificarPermissao('usuarios_editar'), adminUsuariosController.formEditarUsuario);
router.post('/:id/editar', verificarPermissao('usuarios_editar'), adminUsuariosController.atualizarUsuario);
router.post('/:id/excluir', verificarPermissao('usuarios_deletar'), adminUsuariosController.removerUsuario);

module.exports = router;
