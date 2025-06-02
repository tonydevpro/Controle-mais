function verificarAutenticacao(req, res, next) {
    if (req.session && req.session.usuario) {
        return next(); // Usuário autenticado, prossegue para a próxima rota
    }
    
    // Usuário não autenticado, redireciona para a página de login
    res.redirect('/login');
    }

    module.exports = verificarAutenticacao;