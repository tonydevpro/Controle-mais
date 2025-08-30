const express = require('express');
const router = express.Router();
const movimentacoesController = require('../controllers/movimentacoesControladores');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// Todas as rotas exigem autenticação
router.use(verificarAutenticacao);

// Listar movimentações
router.get(
  '/',
  verificarPermissao('movimentacoes_listar'),
  movimentacoesController.listarMovimentacoes
);

// Formulário para adicionar movimentação
router.get(
  '/adicionarMovimentacoes',
  verificarPermissao('movimentacoes_adicionar'),
  movimentacoesController.adicionarMovimentacoes
);

// Registrar movimentação (POST)
router.post(
  '/registrar',
  verificarPermissao('movimentacoes_registrar'),
  movimentacoesController.registrar
);

// Formulário para editar movimentação
router.get(
  '/editarMov/:id',
  verificarPermissao('movimentacoes_editar'),
  movimentacoesController.formEditarMov
);

// Atualizar movimentação (POST)
router.post(
  '/editarMov/:id',
  verificarPermissao('movimentacoes_editar'),
  movimentacoesController.atualizarMov
);

// Deletar movimentação (POST)
router.post(
  '/excluirMov/:id',
  verificarPermissao('movimentacoes_excluir'),
  movimentacoesController.deletarMov
);

// Relatório (GET e POST)
router.get(
  '/relatorio',
  verificarPermissao('movimentacoes_relatorio'),
  movimentacoesController.filtrarForm
);

router.post(
  '/relatorio',
  verificarPermissao('movimentacoes_relatorio'),
  movimentacoesController.filtrarMovimentacoes
);

module.exports = router;
