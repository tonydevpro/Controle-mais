const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });

const express = require('express');
const app = express();

console.log('Iniciando servidor...');

app.get('/health', (req, res) => {
  console.log('GET /health');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  console.log('GET /');
  res.send('Servidor funcionando!');
});

app.use((err, req, res, next) => {
  console.error('Erro capturado:', err);
  res.status(500).json({ erro: err.message, stack: err.stack });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor iniciado na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}/health`);
});

// Catch erros não tratados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});