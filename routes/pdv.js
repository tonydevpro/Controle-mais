const express = require('express');
const router = express.Router();
const pdvController = require('../controllers/pdvController');
const  autenticarUsuario  = require('../middlewares/autenticacao');

router.get('/', autenticarUsuario, pdvController.exibirPDV);
router.post('/finalizar', autenticarUsuario, pdvController.finalizarVenda);

module.exports = router;
