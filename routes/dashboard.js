const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const verificarAutenticacao = require('../middlewares/autenticacao');


// Middleware para verificar autenticação
router.get('/dashboard', verificarAutenticacao, dashboardController.exibirDashboard);

// Rota para exibir o dashboard principal
router.get('/', verificarAutenticacao, dashboardController.exibirDashboardPrincipal);


// Rota para exibir o dashboard
//router.get('/', dashboardController.exibirDashboard);

router.get('/exportar', dashboardController.exportarCSV);
// Rota para exportar dados em CSV

router.get('/exportar-pdf', dashboardController.exportarPDF);
// Rota para exportar dados em PDF

router.get('/financeiro', verificarAutenticacao, dashboardController.dashboardFinanceiro);
// Rota para exibir o dashboard financeiro
module.exports = router;
