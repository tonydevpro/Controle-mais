// models/produto.js
const conexao = require('../banco/conexao');

const Produto = {
  // Criar produto
  criar: (produto, callback) => {
    const sql = `
      INSERT INTO produtos 
      (nome, descricao, preco_custo, preco_venda, quantidade, usuario_id, loja_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
        produto.loja_id
      ],
      callback
    );
  },

  // Listar produtos por loja
  listarPorLoja: (loja_id, callback) => {
  const sql = 'SELECT * FROM produtos WHERE loja_id = ?';
  conexao.query(sql, [loja_id], (err, resultados) => {
    if (err) {
      console.error('Erro SQL listarPorLoja:', err);
      return callback(err);
    }
    console.log('Produtos encontrados:', resultados);
    callback(null, resultados);
  });
},

  // Buscar produto específico por ID e loja
  buscarPorId: (id, loja_id, callback) => {
    const sql = 'SELECT * FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1';
    conexao.query(sql, [id, loja_id], (err, resultados) => {
      if (err) return callback(err);
      callback(null, resultados[0] || null);
    });
  },

  // Atualizar produto
  atualizar: (id, loja_id, produto, callback) => {
    const sql = `
      UPDATE produtos 
      SET nome = ?, descricao = ?, preco_custo = ?, preco_venda = ?, quantidade = ? 
      WHERE id = ? AND loja_id = ?
    `;
    conexao.query(
      sql,
      [
        produto.nome,
        produto.descricao,
        produto.preco_custo,
        produto.preco_venda,
        produto.quantidade,
        id,
        loja_id
      ],
      callback
    );
  },

  // Excluir produto
  excluir: (id, loja_id, callback) => {
    const sql = 'DELETE FROM produtos WHERE id = ? AND loja_id = ?';
    conexao.query(sql, [id, loja_id], callback);
  }
};

// Alias para compatibilidade
Produto.listar = Produto.listarPorLoja;
Produto.inserir = Produto.criar;

// Alias para manter compatibilidade com o controller
Produto.listar = Produto.listarPorLoja;

module.exports = Produto;
