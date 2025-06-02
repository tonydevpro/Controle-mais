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
  const { itens } = req.body; // itens = [{produto_id, quantidade, preco_unitario}]
  const usuarioId = req.session.usuario.id;

  try {
    let total = 0;

    // Calcula total da venda
    for (const item of itens) {
      total += (item.quantidade * item.preco_unitario) - item.desconto;
    }

    // Insere venda
    const [resultado] = await conectar.execute(
      'INSERT INTO vendas (usuario_id, total) VALUES (?, ?)',
      [usuarioId, total]
    );
    const vendaId = resultado.insertId;

    // Insere itens e atualiza estoque
    for (const item of itens) {
      await conectar.execute(
        'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, desconto) VALUES (?, ?, ?, ?, ?)',
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.desconto]
      );

      await conectar.execute(
        'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ? AND usuario_id = ?',
        [item.quantidade, item.produto_id, usuarioId]
      );

      // Opcional: registrar como movimentação
      await conectar.execute(
        `INSERT INTO movimentacoes (usuario_id, produto_id, tipo, quantidade, data, observacao) 
         VALUES (?, ?, 'saida', ?, NOW(), 'Venda no PDV')`,
        [usuarioId, item.produto_id, item.quantidade]
      );
    }
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
  return res.status(400).json({ sucesso: false, mensagem: 'Nenhum item na venda.' });
}


    res.json({ sucesso: true, vendaId });
  } catch (erro) {
    console.error('Erro ao finalizar venda:', erro);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao finalizar venda.' });
  }
};

