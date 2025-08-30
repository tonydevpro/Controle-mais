const conectar = require('../banco/conexao');

exports.atualizarEstoque = async (produto_id, quantidade, tipo, usuario_id) => {
  const operador = tipo === 'entrada' ? '+' : '-';
  await conectar.execute(
    `UPDATE produtos SET quantidade = quantidade ${operador} ? WHERE id = ? AND usuario_id = ?`,
    [quantidade, produto_id, usuario_id]
  );
};

exports.verificarUsuario = async (tabela, id, usuario_id) => {
  const [resultado] = await conectar.execute(
    `SELECT * FROM ${tabela} WHERE id = ? AND usuario_id = ?`,
    [id, usuario_id]
  );
  return resultado.length > 0 ? resultado[0] : null;
};
