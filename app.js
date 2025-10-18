// ✅ SEMPRE carregar .env.production se existir
require('dotenv').config({ path: path.join(__dirname, '.env.production') });

// Se não existir, tenta .env
if (!process.env.BREVO_API_KEY) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

console.log(`✅ BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Carregada' : '❌ Falta'}`);

// ... resto igual

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

console.log('✅ Módulos carregados');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`BREVO_API_KEY definida: ${!!process.env.BREVO_API_KEY}`);

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