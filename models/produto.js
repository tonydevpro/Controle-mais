const conexao = require('../banco/conexao');

const Produto = {
  // Criar produto
  criar: (produto, callback) => {
    const sql = `
      INSERT INTO produtos 
      (nome, descricao, preco_custo, preco_venda, quantidade, usuario_id, loja_id, estoque_minimo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    conexao.query(
      sql,
      [
        produto.nome,
        produto.descricao,
        produto.preco_custo,
        produto.preco_venda,
        produto.quantidade,
        produto.usuario_id,
        produto.loja_id,
        produto.estoque_minimo ?? 0
      ],
      callback
    );
  },

  // Listar produtos por loja
  listarPorLoja: (loja_id, callback) => {
    const sql = 'SELECT * FROM produtos WHERE loja_id = ? AND ativo = 1';
    conexao.query(sql, [loja_id], (err, resultados) => {
      if (err) {
        console.error('Erro SQL listarPorLoja:', err);
        return callback(err);
      }
      callback(null, resultados);
    });
  },

  // Buscar produto específico por ID e loja
  buscarPorId: async (id, loja_id) => {
    const sql = 'SELECT * FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1';
    try {
      const [resultados] = await conexao.execute(sql, [id, loja_id]);
      return resultados[0] || null;
    } catch (err) {
      console.error('Erro no SQL buscarPorId:', err);
      throw err;
    }
  },

  // Atualizar produto
  atualizar: async (id, loja_id, produto) => {
  const sql = `
    UPDATE produtos 
    SET nome = ?, descricao = ?, preco_custo = ?, preco_venda = ?, quantidade = ?, estoque_minimo = ?
    WHERE id = ? AND loja_id = ?
  `;
  const params = [
    produto.nome ?? null,
    produto.descricao ?? '',
    produto.preco_custo ?? 0,
    produto.preco_venda ?? 0,
    produto.quantidade ?? 0,
    produto.estoque_minimo ?? 0,
    id,
    loja_id
  ];
  const [resultado] = await conexao.execute(sql, params);
  return resultado;
},

  // Excluir produto
  excluir: (id, loja_id, callback) => {
    const sql = 'DELETE FROM produtos WHERE id = ? AND loja_id = ?';
    conexao.query(sql, [id, loja_id], callback);
  }
};

// Aliases
Produto.listar = Produto.listarPorLoja;
Produto.inserir = Produto.criar;

module.exports = Produto;
