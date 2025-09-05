const conectar = require('../banco/conexao');
const { atualizarEstoque } = require('./utilsController');

// Exibir tela do PDV
exports.exibirPDV = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;

    const [produtos] = await conectar.execute(
      'SELECT id, nome, preco_venda, quantidade FROM produtos WHERE loja_id = ? AND ativo = 1',
      [loja_id]
    );

    res.render('pdv/pdv', { produtos, usuario: req.session.usuario });
  } catch (erro) {
    console.error('Erro ao exibir PDV:', erro);
    res.status(500).send('Erro ao carregar PDV.');
  }
};

// Finalizar venda no PDV com validações e transaction
exports.finalizarVenda = async (req, res) => {
  const { itens, forma_pagamento } = req.body;
  const usuario_id = req.session.usuario.id;
  const loja_id = req.session.usuario.loja_id;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nenhum item na venda.' });
  }

  const connection = await conectar.getConnection();
  try {
    await connection.beginTransaction();

    let total = 0;

    for (const item of itens) {
      // Validar se o produto existe e está ativo
      const [produtoValido] = await connection.execute(
        'SELECT id, preco_venda, quantidade FROM produtos WHERE id = ? AND loja_id = ? AND ativo = 1',
        [item.produto_id, loja_id]
      );

      if (produtoValido.length === 0) {
        throw new Error(`Produto inválido ou inativo: ${item.produto_id}`);
      }

      // Checar estoque disponível
      if (produtoValido[0].quantidade < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto: ${produtoValido[0].nome}`);
      }

      // Corrigir preço unitário com valor atual do produto
      item.preco_unitario = produtoValido[0].preco_venda;

      total += (item.quantidade * item.preco_unitario) - (item.desconto || 0);
    }

    // Registrar venda
    const [venda] = await connection.execute(
      'INSERT INTO vendas (usuario_id, loja_id, total, forma_pagamento, data) VALUES (?, ?, ?, ?, NOW())',
      [usuario_id, loja_id, total, forma_pagamento]
    );

    const vendaId = venda.insertId;

    // Registrar itens da venda e movimentações
    for (const item of itens) {
      await connection.execute(
        'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, desconto) VALUES (?, ?, ?, ?, ?)',
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.desconto || 0]
      );

      // Atualizar estoque
      await connection.execute(
        'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ? AND loja_id = ?',
        [item.quantidade, item.produto_id, loja_id]
      );

      // Inserir movimentação
      await connection.execute(
        'INSERT INTO movimentacoes (usuario_id, produto_id, tipo, quantidade, data, observacao, desconto, loja_id) VALUES (?, ?, "saida", ?, NOW(), "Venda no PDV", ?, ?)',
        [usuario_id, item.produto_id, item.quantidade, item.desconto || 0, loja_id]
      );
    }

    await connection.commit();
    res.json({ sucesso: true, vendaId });

  } catch (erro) {
    await connection.rollback();
    console.error('Erro ao finalizar venda:', erro.message);
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  } finally {
    connection.release();
  }
};
