const conectar = require('../banco/conexao');

// Verificar se o usuário está autenticado
function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.redirect('/login');
}

// Verificar permissões específicas (baseadas em cargos)
function verificarPermissao(chave) {
  return async function (req, res, next) {
    try {
      const usuario = req.session.usuario;
      if (!usuario) return res.redirect('/login');

      const [linhas] = await conectar.execute(`
        SELECT p.chave 
        FROM permissoes p
        JOIN cargo_permissoes cp ON cp.permissao_id = p.id
        WHERE cp.cargo_id = ?
      `, [usuario.cargo_id]);

      const permissoesUsuario = linhas.map(p => p.chave);

      if (permissoesUsuario.includes(chave)) {
        return next();
      } else {
        return res.status(403).render('erroPermissao', {
          mensagem: 'Você não tem permissão para essa funcionalidade.'
        });
      }
    } catch (erro) {
      console.error('Erro ao verificar permissão:', erro);
      return res.status(500).send('Erro interno.');
    }
  };
}

// Verificar se é administrador
function verificarAdmin(req, res, next) {
  const usuario = req.session.usuario;
  if (usuario && usuario.tipo === 'admin') {
    return next();
  }
  return res.status(403).send('Acesso restrito: apenas administradores podem acessar esta página.');
}

module.exports = {
  verificarAutenticacao,
  verificarPermissao,
  verificarAdmin
};
