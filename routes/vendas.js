const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendasController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// Listar todas as vendas
router.get(
  '/',
  verificarAutenticacao,
  verificarPermissao('vendas_listar'),
  vendasController.listarVendas
);


// Gerar recibo PDF
router.get(
  '/:id/recibo-pdf',
  verificarAutenticacao,
  verificarPermissao('vendas_recibo_pdf'),
  vendasController.gerarReciboPDF
);

// Excluir venda
router.post(
  '/excluir/:id',
  verificarAutenticacao,
  verificarPermissao('vendas_excluir'),
  vendasController.excluirVenda
);

// Relatórios
router.get(
  '/relatorio',
  verificarAutenticacao,
  verificarPermissao('vendas_relatorio_ver'),
  vendasController.exibirRelatorio
);

router.get(
  '/relatorio/pdf',
  verificarAutenticacao,
  verificarPermissao('vendas_relatorio_pdf'),
  vendasController.gerarPDF
);
// Detalhar uma venda
router.get(
  '/:id',
  verificarAutenticacao,
  verificarPermissao('vendas_detalhar'),
  vendasController.detalharVenda
);

module.exports = router;
