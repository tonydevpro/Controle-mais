require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');


app.use(session({ secret: 'controlemais_supersegredo', resave: false, saveUninitialized: false }));

// Configuração do flash
app.use(flash());

// Middleware de sessão para mensagens globais
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
const rotaProdutos = require('./routes/produtos');
const rotaMovimentacoes = require('./routes/movimentacoes');
const dashboardRoutes = require('./routes/dashboard');
const rotaAuth = require('./routes/auth');
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

// 🚫 Middleware para erros 403 (Acesso Negado)
app.use((err, req, res, next) => {
  if (err.status === 403) {
    return res.status(403).render('403', { 
      titulo: "Acesso Negado",
      mensagem: err.message || "Você não tem permissão para acessar esta página."
    });
  }
  next(err);
});

// ❌ Middleware para erros 404 (Página não encontrada)
app.use((req, res) => {
  res.status(404).render('404', {
    titulo: "Página não encontrada",
    mensagem: "Ops! A página que você tentou acessar não existe."
  });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
