// ============================================
// ARQUIVO: app.js (SOLUÇÃO FINAL)
// ============================================

const path = require('path');
const fs = require('fs');

console.log('\n🔍 [STARTUP] Inicializando variáveis de ambiente...');

// ✅ Tenta carregar .env.production PRIMEIRO (Railway vai preferir isto)
const envProductionPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envProductionPath)) {
  console.log('📁 Encontrado: .env.production');
  require('dotenv').config({ path: envProductionPath });
} else {
  console.log('📁 Não encontrado: .env.production');
  // ✅ Se não existir, tenta .env
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// ✅ FALLBACK: Se BREVO_API_KEY não foi carregada, tenta outras variáveis
if (!process.env.BREVO_API_KEY) {
  console.log('⚠️  BREVO_API_KEY não encontrada, tentando alternativas...');
  
  // Tenta SENDGRID_API_KEY
  if (process.env.SENDGRID_API_KEY) {
    process.env.BREVO_API_KEY = process.env.SENDGRID_API_KEY;
    console.log('✅ Usando SENDGRID_API_KEY como BREVO_API_KEY');
  }
  // Tenta EMAIL_API_KEY
  else if (process.env.EMAIL_API_KEY) {
    process.env.BREVO_API_KEY = process.env.EMAIL_API_KEY;
    console.log('✅ Usando EMAIL_API_KEY como BREVO_API_KEY');
  }
  // Tenta API_KEY
  else if (process.env.API_KEY) {
    process.env.BREVO_API_KEY = process.env.API_KEY;
    console.log('✅ Usando API_KEY como BREVO_API_KEY');
  }
}

// ✅ ÚLTIMO FALLBACK: Variável hardcoded para Railway (TEMPORÁRIO)
if (!process.env.BREVO_API_KEY && process.env.NODE_ENV === 'production') {
  console.log('⚠️  Nenhuma variável de email encontrada em produção!');
  console.log('💡 Dica: Adicione BREVO_API_KEY nas Variables do Railway');
}

// Debug final
console.log('\n📊 [STARTUP] Status das variáveis:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Carregada' : '❌ Falta'}`);
console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'padrão'}`);
console.log('');

const express = require('express');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');

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

// 🧪 ROTA DE DEBUG
app.get('/debug-env', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    brevo_api_key_defined: !!process.env.BREVO_API_KEY,
    brevo_api_key_length: process.env.BREVO_API_KEY?.length || 0,
    brevo_api_key_preview: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 15) + '...' : 'UNDEFINED',
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
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});