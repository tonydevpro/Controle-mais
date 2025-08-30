const conectar = require('../banco/conexao');

// Gerenciar usuários da mesma loja
exports.gerenciarUsuarios = async (req, res) => {
  try {
    const usuarioLogado = req.session.usuario;

    // Somente donos podem acessar o gerenciamento
    if (!usuarioLogado.eh_dono) {
      return res.status(403).send('Acesso negado');
    }

    const [usuarios] = await conectar.execute(
      'SELECT id, nome, email, cargo_id, eh_dono FROM usuarios WHERE loja_id = ?',
      [usuarioLogado.loja_id]
    );

    res.render('usuarios/gerenciar', { usuarios });
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    res.status(500).send('Erro ao carregar usuários');
  }
};

// Atualizar tipo/cargo de usuário
exports.atualizarTipo = async (req, res) => {
  const { id, cargo_id, eh_dono } = req.body;
  const usuarioLogado = req.session.usuario;

  try {
    if (!usuarioLogado) {
      return res.redirect('/login');
    }

    // Verifica se o usuário pertence à mesma loja
    const [usuarios] = await conectar.execute(
      'SELECT id FROM usuarios WHERE id = ? AND loja_id = ?',
      [id, usuarioLogado.loja_id]
    );

    if (usuarios.length === 0) {
      return res.status(403).send('Usuário não pertence à sua loja');
    }

    // Se for atualizar o dono, somente o dono atual pode fazer isso
    if (eh_dono !== undefined) {
      if (!usuarioLogado.eh_dono) {
        return res.status(403).send('Apenas o dono pode mudar esse campo');
      }

      await conectar.execute(
        'UPDATE usuarios SET cargo = ?, eh_dono = ? WHERE id = ? AND loja_id = ?',
        [cargo_id, eh_dono, id, usuarioLogado.loja_id]
      );
    } else {
      // Atualiza apenas o cargo
      await conectar.execute(
        'UPDATE usuarios SET cargo = ? WHERE id = ? AND loja_id = ?',
        [cargo_id, id, usuarioLogado.loja_id]
      );
    }

    res.redirect('/usuarios/gerenciar');
  } catch (err) {
    console.error('Erro ao atualizar tipo de usuário:', err);
    res.status(500).send('Erro ao atualizar usuário');
  }
};
