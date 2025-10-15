// ARQUIVO: app.js (VERSÃO CORRIGIDA - SEM CONNECT-MONGO)
// ============================================

console.log('🔍 [STARTUP] Iniciando aplicação...');
console.log('🔍 [STARTUP] NODE_ENV:', process.env.NODE_ENV);

// Carregar variáveis PRIMEIRO
require('dotenv').config();

console.log('\n🔍 [DEBUG] Todas as variáveis de ambiente:');
console.log('━'.repeat(60));
Object.keys(process.env)
  .filter(key => key.includes('BREVO') || key.includes('EMAIL') || key.includes('FROM') || key.includes('MYSQL'))
  .forEach(key => {
    const valor = process.env[key];
    const mascarado = valor ? `${valor.substring(0, 10)}...` : 'UNDEFINED';
    console.log(`  ${key}: ${mascarado}`);
  });
console.log('━'.repeat(60));

// Verificação crítica
const chaveBrevo = process.env.BREVO_API_KEY;
if (!chaveBrevo) {
  console.error('\n❌ CRÍTICO: BREVO_API_KEY não encontrada!');
  console.error('Verifique em Railway → Variables');
  console.error('A chave deve estar exatamente como: BREVO_API_KEY=xxx_sua_chave_xxx\n');
} else {
  console.log('\n✅ BREVO_API_KEY carregada com sucesso!\n');
}

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

// ✅ MANTÉM O MEMORYSTORE COMO ANTES (sem connect-mongo)
app.use(session({ 
  secret: 'controlemais_supersegredo', 
  resave: false, 
  saveUninitialized: false
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.sucesso = req.flash('sucesso');
  res.locals.erro = req.flash('erro');
  res.locals.usuario = req.session.usuario || null;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
const rotaAuth = require('./routes/auth');
const rotaProdutos = require('./routes/produtos');
const rotaMovimentacoes = require('./routes/movimentacoes');
const dashboardRoutes = require('./routes/dashboard');
const rotaPdv = require('./routes/pdv');
const rotaVendas = require('./routes/vendas');
const rotaUsuarios = require('./routes/usuarios');
const rotaAdminCargos = require('./routes/adminCargos');
const rotaAdminLojas = require('./routes/adminLojas');
const rotaAdminUsuarios = require('./routes/adminUsuarios');

app.use('/', rotaAuth);
app.use('/admin', rotaAdminCargos);
app.use('/admin/lojas', rotaAdminLojas);
app.use('/admin/usuarios', rotaAdminUsuarios);
app.use('/vendas', rotaVendas);
app.use('/usuario', rotaUsuarios);
app.use('/dashboard', dashboardRoutes);
app.use('/movimentacoes', rotaMovimentacoes);
app.use('/produtos', rotaProdutos);
app.use('/pdv', rotaPdv);

// ⚠️ ROTA DE DEBUG TEMPORÁRIA
app.get('/debug-env', (req, res) => {
  const brevoKey = process.env.BREVO_API_KEY;
  res.json({
    brevo_key_defined: !!brevoKey,
    brevo_key_length: brevoKey ? brevoKey.length : 0,
    brevo_key_first_10_chars: brevoKey ? brevoKey.substring(0, 10) : 'UNDEFINED',
    from_email: process.env.FROM_EMAIL,
    from_name: process.env.FROM_NAME,
    app_url: process.env.APP_URL,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.render('index');
});

app.use((err, req, res, next) => {
  if (err.status === 403) {
    return res.status(403).render('403', { 
      titulo: "Acesso Negado",
      mensagem: err.message || "Você não tem permissão para acessar esta página."
    });
  }
  next(err);
});

app.use((req, res) => {
  res.status(404).render('404', {
    titulo: "Página não encontrada",
    mensagem: "Ops! A página que você tentou acessar não existe."
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📧 Email service: ${process.env.BREVO_API_KEY ? '✅ Pronto' : '❌ Não configurado'}\n`);
});
