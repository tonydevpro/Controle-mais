const express = require('express');
const router = express.Router();
const pdvController = require('../controllers/pdvController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// Exibir PDV
router.get(
  '/',
  verificarAutenticacao,
  verificarPermissao('pdv_acessar'),
  pdvController.exibirPDV
);

// Finalizar venda
router.post(
  '/finalizar',
  verificarAutenticacao,
  verificarPermissao('pdv_finalizar'),
  pdvController.finalizarVenda
);

module.exports = router;