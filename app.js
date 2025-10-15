// ============================================
// ARQUIVO: app.js (VERSÃO SUPER SIMPLES PARA DEBUG)
// ============================================

// NÃO carregue dotenv aqui na nuvem
// require('dotenv').config();

console.log('\n' + '═'.repeat(70));
console.log('🔍 TESTE DE VARIÁVEIS DE AMBIENTE');
console.log('═'.repeat(70));

// TESTE 1: Listar TUDO
console.log('\n📋 TESTE 1: Todas as variáveis (primeiros 50 chars de cada):');
console.log('─'.repeat(70));
Object.keys(process.env)
  .sort()
  .forEach(key => {
    const valor = process.env[key];
    const display = valor.length > 50 ? valor.substring(0, 50) + '...' : valor;
    console.log(`${key}: ${display}`);
  });

// TESTE 2: Variável específica
console.log('\n' + '─'.repeat(70));
console.log('📋 TESTE 2: Variável BREVO_API_KEY específica:');
console.log('─'.repeat(70));
const brevoKey = process.env.BREVO_API_KEY;
console.log(`Valor: ${brevoKey}`);
console.log(`Type: ${typeof brevoKey}`);
console.log(`Definida: ${!!brevoKey}`);
console.log(`Tamanho: ${brevoKey ? brevoKey.length : 0}`);
console.log(`Primeiros 20 chars: ${brevoKey ? brevoKey.substring(0, 20) : 'N/A'}`);

// TESTE 3: Variáveis relacionadas
console.log('\n' + '─'.repeat(70));
console.log('📋 TESTE 3: Todas as variáveis que contêm "BREVO" ou "EMAIL":');
console.log('─'.repeat(70));
Object.keys(process.env)
  .filter(key => key.toUpperCase().includes('BREVO') || key.toUpperCase().includes('EMAIL') || key.toUpperCase().includes('FROM'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

console.log('\n' + '═'.repeat(70) + '\n');

// Agora sim, carregar o express
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

// ✅ Carrega dotenv AQUI para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

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
  const brevoKey = process.env.BREVO_API_KEY;
  const todasVars = {};
  
  Object.keys(process.env).forEach(key => {
    if (key.includes('BREVO') || key.includes('EMAIL') || key.includes('FROM') || key.includes('MYSQL') || key.includes('APP')) {
      todasVars[key] = process.env[key];
    }
  });

  res.json({
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    brevo_api_key: {
      definida: !!brevoKey,
      tamanho: brevoKey ? brevoKey.length : 0,
      primeiros_20_chars: brevoKey ? brevoKey.substring(0, 20) : 'UNDEFINED',
      tipo: typeof brevoKey,
      valor_completo: brevoKey // ⚠️ Cuidado: isto mostra a chave! Remova em produção!
    },
    todas_variaveis_relevantes: todasVars
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