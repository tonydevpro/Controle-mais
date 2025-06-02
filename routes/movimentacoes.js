const express = require('express');
const router = express.Router();
const movimentacoesController = require('../controllers/movimentacoesControladores'); // ajuste o caminho se precisar
const verificarAutenticacao = require('../middlewares/autenticacao');

// Middleware para verificar autenticação


router.get('/', verificarAutenticacao,movimentacoesController.listarMovimentacoes);
router.get('/adicionarMovimentacoes', movimentacoesController.adicionarMovimentacoes);
// Rota POST para registrar movimentação
router.post('/registrar', movimentacoesController.registrar);

// Formulário para editar produto (GET)
router.get('/editarMov/:id', movimentacoesController.formEditarMov);

// Atualizar produto (POST)
router.post('/editarMov/:id', movimentacoesController.atualizarMov);

// Deletar produto (POST)
router.post('/excluirMov/:id', movimentacoesController.deletarMov);

router.get('/relatorio', verificarAutenticacao, movimentacoesController.filtrarForm);
router.post('/relatorio', movimentacoesController.filtrarMovimentacoes);

module.exports = router;
