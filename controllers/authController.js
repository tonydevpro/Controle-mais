const e = require('express');
const conectar = require('../banco/conexao');
const bcrypt = require('bcryptjs');

//mostrar formulario de login
exports.formLogin = (req, res) => {
  res.render('auth/login', { erro: req.flash('erro') });
};

//processar o login
exports.logar = async (req, res) => {
    const { email, senha } = req.body;

    try {
        const [usuarios] = await conectar.execute('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length === 0) {
            return res.render('login', { erro: 'Usuário não encontrado' });
        }
        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.render('login', { erro: 'Senha incorreta' });
        }

        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo // Adiciona o tipo de usuário à sessão
        };

        res.redirect('/dashboard');

    } catch (erro) {
        console.error('Erro ao logar:', erro);
        res.render('login', { erro: 'Erro ao processar login' });
    }
};

// Mostrar formulário de cadastro
exports.formRegistro = (req, res) => {
    res.render('auth/registrar', { erro: req.flash('erro') });
};

// Processar o registro
exports.registrar = async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        const [existe] = await conectar.execute('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (existe.length > 0) {
            return res.render('auth/registrar', { erro: 'Email já cadastrado' });
        }
        const hash = await bcrypt.hash(senha, 10);
        await conectar.execute('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, hash]);

        res.redirect('login');
    } catch (erro) {
        console.error('Erro ao registrar usuário:', erro);
        res.render('auth/registrar', { erro: 'Erro ao processar registro' });
    }
    
}
// Deslogar o usuário
exports.logout = (req, res) => {
    req.session.destroy((erro) => {
        res.redirect('login');
    });
};