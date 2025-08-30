const conectar = require('../banco/conexao');
const { atualizarEstoque } = require('./utilsController');

// Exibir tela do PDV
exports.exibirPDV = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;

    // Agora os produtos vêm por loja, não apenas por usuário
    const [produtos] = await conectar.execute(
      'SELECT id, nome, preco_venda, quantidade FROM produtos WHERE loja_id = ?',
      [loja_id]
    );

    res.render('pdv/pdv', { produtos, usuario: req.session.usuario });
  } catch (erro) {
    console.error('Erro ao exibir PDV:', erro);
    res.status(500).send('Erro ao carregar PDV.');
  }
};

// Finalizar venda no PDV
exports.finalizarVenda = async (req, res) => {
  const { itens, forma_pagamento } = req.body;
  const usuario_id = req.session.usuario.id;
  const loja_id = req.session.usuario.loja_id;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nenhum item na venda.' });
  }

  try {
    let total = 0;
    itens.forEach(item => {
      total += (item.quantidade * item.preco_unitario) - (item.desconto || 0);
    });

    // Registrar venda
    const [venda] = await conectar.execute(
      'INSERT INTO vendas (usuario_id, loja_id, total, forma_pagamento, data) VALUES (?, ?, ?, ?, NOW())',
      [usuario_id, loja_id, total, forma_pagamento]
    );

    const vendaId = venda.insertId;

    // Registrar itens da venda + movimentação de estoque
    for (const item of itens) {
      await conectar.execute(
        `INSERT INTO itens_venda 
          (venda_id, produto_id, quantidade, preco_unitario, desconto) 
        VALUES (?, ?, ?, ?, ?)`,
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.desconto || 0]
      );

      await atualizarEstoque(item.produto_id, item.quantidade, 'saida', usuario_id);

      await conectar.execute(
        `INSERT INTO movimentacoes 
          (usuario_id, produto_id, tipo, quantidade, data, observacao, desconto, loja_id) 
        VALUES (?, ?, "saida", ?, NOW(), "Venda no PDV", ?, ?)`,
        [usuario_id, item.produto_id, item.quantidade, item.desconto || 0, loja_id]
      );
    }

    res.json({ sucesso: true, vendaId });
  } catch (erro) {
    console.error('Erro ao finalizar venda:', erro);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao finalizar venda.' });
  }
};
