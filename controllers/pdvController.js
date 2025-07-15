const conectar = require('../banco/conexao');

exports.exibirPDV = async (req, res) => {
  try {
    const [produtos] = await conectar.execute(
      'SELECT id, nome, preco_venda, quantidade FROM produtos WHERE usuario_id = ?',
      [req.session.usuario.id]
    );
    console.log('Produtos carregados:', produtos);
    res.render('pdv/pdv', { produtos, usuario: req.session.usuario });
  } catch (erro) {
    console.error('Erro ao exibir PDV:', erro);
    res.status(500).send('Erro ao carregar PDV.');
  }
};

exports.finalizarVenda = async (req, res) => {
  const { itens, forma_pagamento } = req.body;
  const usuarioId = req.session.usuario.id;

  // 🛡️ Validação básica
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nenhum item na venda.' });
  }

  try {
    let total = 0;

    // Calcula o total
    for (const item of itens) {
      total += (item.quantidade * item.preco_unitario) - (item.desconto || 0);
    }

    // Insere a venda
    const [resultado] = await conectar.execute(
      'INSERT INTO vendas (usuario_id, total, forma_pagamento) VALUES (?, ?, ?)',
      [usuarioId, total, forma_pagamento]
    );
    const vendaId = resultado.insertId;

    // Insere itens e atualiza estoque
    for (const item of itens) {
      await conectar.execute(
        'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, desconto) VALUES (?, ?, ?, ?, ?)',
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.desconto || 0]
      );

      await conectar.execute(
        'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ? AND usuario_id = ?',
        [item.quantidade, item.produto_id, usuarioId]
      );

      await conectar.execute(
        `INSERT INTO movimentacoes (usuario_id, produto_id, tipo, quantidade, data, observacao) 
         VALUES (?, ?, 'saida', ?, NOW(), 'Venda no PDV')`,
        [usuarioId, item.produto_id, item.quantidade]
      );
    }

    // ✅ Retorna o ID da venda para abrir recibo depois
    res.json({ sucesso: true, vendaId });
  } catch (erro) {
    console.error('Erro ao finalizar venda:', erro);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao finalizar venda.' });
  }
};
