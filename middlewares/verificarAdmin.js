// middlewares/verificarAdmin.js
function verificarAdmin(req, res, next) {
     console.log(req.session.usuario); // debug
  if (req.session.usuario && req.session.usuario.tipo === 'admin') {
    return next(); // Usuário é admin, continua para a rota
  }
  // Caso não seja admin ou não esteja logado
  return res.status(403).send('Acesso restrito: apenas administradores podem acessar esta página.');
}

module.exports = verificarAdmin;

