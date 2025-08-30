const express = require('express');
const router = express.Router();
const adminCargosController = require('../controllers/adminCargosController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// Middleware aplicado a todas as rotas deste arquivo
router.use(verificarAutenticacao);

// Listar todos os cargos
router.get(
  '/cargos',
  verificarPermissao('admin'),
  adminCargosController.listarCargos
);

// Exibir formulário de novo cargo
router.get(
  '/cargos/novo',
  verificarPermissao('admin'),
  adminCargosController.exibirFormularioNovoCargo
);

// Processar criação de cargo
router.post(
  '/cargos/novo',
  verificarPermissao('admin'),
  adminCargosController.criarCargo
);

// Formulário para editar cargo e permissões
router.get(
  '/cargos/:id',
  verificarPermissao('admin'),
  adminCargosController.formEditarCargo
);

// Atualizar permissões do cargo
router.post(
  '/cargos/:id',
  verificarPermissao('admin'),
  adminCargosController.atualizarCargo
);

module.exports = router;
