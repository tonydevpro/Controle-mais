const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarAutenticacao, verificarPermissao } = require('../middlewares');

// Todas as rotas exigem autenticação
router.use(verificarAutenticacao);

// Dashboard principal
router.get(
  '/dashboard', 
  verificarPermissao('dashboard_geral'), 
  dashboardController.exibirDashboard
);

// Dashboard inicial (home)
router.get(
  '/', 
  verificarPermissao('dashboard_principal'), 
  dashboardController.exibirDashboardPrincipal
);

// Exportar CSV
router.get(
  '/exportar', 
  verificarPermissao('dashboard_exportar_csv'), 
  dashboardController.exportarCSV
);

// Exportar PDF
router.get(
  '/exportar-pdf', 
  verificarPermissao('dashboard_exportar_pdf'), 
  dashboardController.exportarPDF
);

// Dashboard financeiro
router.get(
  '/financeiro', 
  verificarPermissao('dashboard_financeiro'), 
  dashboardController.dashboardFinanceiro
);

module.exports = router;
