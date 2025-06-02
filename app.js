const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();


app.use(session({ secret: 'controlemais_supersegredo', resave: false, saveUninitialized: false }));

// Configuração do flash
app.use(flash());
// Configuração do middleware de sessão
app.use((req, res, next) => {
  res.locals.mensagens = req.flash('sucesso');
  res.locals.erros = req.flash('erro');
  next();
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // opcional para JSON
app.use(express.static(path.join(__dirname, 'public')));

// middleware global, em app.js antes das rotas:
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

app.get('/', (req, res) => {

  res.render('index');
});





const rotaProdutos = require('./routes/produtos');
const produto = require('./models/produto');
const rotaMovimentacoes = require('./routes/movimentacoes');
const dashboardRoutes = require('./routes/dashboard');
const rotaAuth = require('./routes/auth');
const rotaPdv = require('./routes/pdv');
const rotaVendas = require('./routes/vendas');
const rotaUsuarios = require('./routes/usuarios');

app.use('/', rotaAuth);

app.use('/vendas', rotaVendas);

app.use('/usuario', rotaUsuarios);

app.use('/dashboard', dashboardRoutes);

app.use('/movimentacoes', rotaMovimentacoes);

app.use('/produtos', rotaProdutos);

app.use('/pdv', rotaPdv);

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
