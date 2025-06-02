const conexao = require('../banco/conexao');

module.exports = {
  listar(callback) {
    conexao.query('SELECT * FROM produtos', callback);
  },
  inserir(produto, callback) {
    conexao.query(
      'INSERT INTO produtos (nome, descricao, preco_custo, preco_venda, quantidade, imagem) VALUES (?, ?, ?, ?, ?, ?)',
      [produto.nome, produto.descricao, produto.preco_custo, produto.preco_venda, produto.quantidade, produto.imagem],
      callback
    );
  },
  // editar, excluir etc.
};
