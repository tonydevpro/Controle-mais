const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendasController');
const autenticarUsuario = require('../middlewares/autenticacao');

router.get('/relatorio', autenticarUsuario, vendasController.exibirRelatorio);
router.get('/relatorio/pdf', autenticarUsuario, vendasController.gerarPDF);

// rota para excluir venda pelo ID (POST)
router.post('/excluir/:id', autenticarUsuario, vendasController.excluirVenda);

router.get('/:id', autenticarUsuario, vendasController.detalharVenda);

router.get('/', autenticarUsuario, vendasController.listarVendas);



module.exports = router;
