const express = require('express');
const router = express.Router();
const controlador = require('../controllers/produtosControladores');
const verificarAutenticacao = require('../middlewares/autenticacao');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/importar', verificarAutenticacao, upload.single('arquivo'), controlador.importarProdutos);


// Middleware para verificar autenticação
router.get('/', verificarAutenticacao, controlador.listar); 
// Página lista todos os produtos
//router.get('/', controlador.listar);

// Formulário para adicionar novo produto
router.get('/adicionar', controlador.formAdicionar);

// Salvar novo produto (POST)
router.post('/salvar', controlador.salvar);

// Formulário para editar produto (GET)
router.get('/editar/:id', controlador.formEditar);

// Atualizar produto (POST)
router.post('/editar/:id', controlador.atualizarProduto);

// Deletar produto (POST)
router.post('/excluir/:id', controlador.deletarProduto);

module.exports = router;
