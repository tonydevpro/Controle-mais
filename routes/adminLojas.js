// routes/adminLojas.js
const express = require('express');
const router = express.Router();
const adminLojasController = require('../controllers/adminLojasController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// 🔹 Middleware global: apenas usuários autenticados
router.use(verificarAutenticacao);

// 🔹 Rotas de administração de lojas (apenas admins/donos podem acessar)
router.get('/nova', verificarPermissao('admin'), adminLojasController.formNovaLoja);
router.post('/nova', verificarPermissao('admin'), adminLojasController.criarLoja);

router.get('/', verificarPermissao('admin'), adminLojasController.listarLojas);

router.get('/:id/editar', verificarPermissao('admin'), adminLojasController.formEditarLoja);
router.post('/:id/editar', verificarPermissao('admin'), adminLojasController.atualizarLoja);

router.post('/:id/excluir', verificarPermissao('admin'), adminLojasController.excluirLoja);

module.exports = router;
