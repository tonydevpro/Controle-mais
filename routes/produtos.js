// routes/produtos.js
const express = require('express');
const router = express.Router();
const controlador = require('../controllers/produtosControladores');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Importar produtos via CSV
router.post(
  '/importar',
  verificarAutenticacao,
  verificarPermissao('produtos_importar'),
  upload.single('arquivo'),
  controlador.importarProdutos
);

// Listar produtos
router.get(
  '/',
  verificarAutenticacao,
  verificarPermissao('produtos_listar'),
  controlador.listar
);

// Formulário para adicionar novo produto
router.get(
  '/adicionar',
  verificarAutenticacao,
  verificarPermissao('produtos_adicionar'),
  controlador.formAdicionar
);

// Salvar novo produto
router.post(
  '/salvar',
  verificarAutenticacao,
  verificarPermissao('produtos_salvar'),
  upload.single('imagem'),
  controlador.salvar
);

// Formulário para editar produto
router.get(
  '/editar/:id',
  verificarAutenticacao,
  verificarPermissao('produtos_editar'),
  controlador.formEditar
);

// Atualizar produto
router.post(
  '/editar/:id',
  verificarAutenticacao,
  verificarPermissao('produtos_editar'),
  upload.single('imagem'),
  controlador.atualizarProduto
);

// Deletar produto
router.post(
  '/excluir/:id',
  verificarAutenticacao,
  verificarPermissao('produtos_excluir'),
  controlador.deletarProduto
);

module.exports = router;
