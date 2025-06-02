const conectar = require('../banco/conexao');

exports.gerenciarUsuarios = async (req, res) => {
  try {
    const [usuarios] = await conectar.execute('SELECT id, nome, email, tipo FROM usuarios');
    res.render('usuarios/gerenciar', { usuarios });
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    res.status(500).send('Erro ao carregar usuários');
  }
};
exports.atualizarTipo = async (req, res) => {
  const { id, tipo } = req.body;
  try {
    await conectar.execute('UPDATE usuarios SET tipo = ? WHERE id = ?', [tipo, id]);
    res.redirect('/usuario/gerenciar');
  } catch (err) {
    console.error('Erro ao atualizar tipo de usuário:', err);
    res.status(500).send('Erro ao atualizar');
  }
};
