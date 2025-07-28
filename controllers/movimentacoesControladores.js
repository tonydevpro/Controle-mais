const conectar = require('../banco/conexao');

exports.adicionarMovimentacoes = async (req, res) => {
  try {
    const [produtos] = await conectar.execute('SELECT id, nome FROM produtos WHERE usuario_id = ? ORDER BY nome',
  [req.session.usuario.id]);
    res.render('movimentacoes/adicionarMovimentacoes', { produtos });
  } catch (erro) {
    console.error('Erro ao carregar formulário de movimentação:', erro);
    res.status(500).send('Erro ao carregar formulário de movimentação');
  }
};

exports.registrar = async (req, res) => {
  const { produto_id, tipo, quantidade, observacao, desconto } = req.body;

  try {
    await conectar.execute(
      'INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, desconto, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [produto_id, tipo, quantidade, observacao, desconto || 0, req.session.usuario.id]
    );

    const operador = tipo === 'entrada' ? '+' : '-';
    await conectar.execute(
      `UPDATE produtos SET quantidade = quantidade ${operador} ? WHERE id = ? AND usuario_id = ?`,

      [quantidade, produto_id, req.session.usuario.id]
    );

    res.redirect('/produtos');
  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    res.status(500).send('Erro ao registrar movimentação');
  }
};

exports.listarMovimentacoes = async (req, res) => {
  try {
    const [movimentacoes] = await conectar.execute(`
      SELECT m.*, p.nome AS nome_produto,
      p.preco_custo,
      p.preco_venda
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.usuario_id = ?
      ORDER BY m.data DESC
    `, [req.session.usuario.id]);

    res.render('movimentacoes/listarMovimentacoes', { movimentacoes });
  } catch (erro) {
    console.error('Erro ao buscar movimentações:', erro);
    res.status(500).send('Erro ao buscar movimentações');
  }
};









// Pegar uma movimentação para editar (exemplo)
exports.formEditarMov = async (req, res) => {
  try {
    const { id } = req.params;
    const [resultado] = await conectar.execute('SELECT * FROM movimentacoes WHERE id = ? AND usuario_id = ?', [id, req.session.usuario.id]);
    if (resultado.length === 0) {
      return res.status(404).send('Movimentação não encontrada');
    }

    // Para mostrar lista de produtos no form de edição:
    const [produtos] = await conectar.execute('SELECT id, nome FROM produtos ORDER BY nome');

    res.render('movimentacoes/formEditarMovimentacao', { movimentacao: resultado[0], produtos });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao carregar formulário de edição');
  }
};

// Atualizar movimentação
exports.atualizarMov = async (req, res) => {
  try {
    const { produto_id, tipo, quantidade, observacao, desconto } = req.body;
    const [verifica] = await conectar.execute(
  'SELECT * FROM movimentacoes WHERE id = ? AND usuario_id = ?',
  [req.params.id, req.session.usuario.id]
);

if (verifica.length === 0) {
  return res.status(403).send('Acesso negado');
}

    await conectar.execute(
      'UPDATE movimentacoes SET produto_id = ?, tipo = ?, quantidade = ?, observacao = ?, desconto = ? WHERE id = ?',
      [produto_id, tipo, quantidade, observacao, desconto || 0, req.params.id]
    );

    // Aqui você pode atualizar o estoque do produto, se necessário

    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao atualizar movimentação');
  }
};

// Deletar movimentação
exports.deletarMov = async (req, res) => {
  try {
    const [verifica] = await conectar.execute(
      'SELECT * FROM movimentacoes WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.session.usuario.id]
    );

    await conectar.execute('DELETE FROM movimentacoes WHERE id = ?', [req.params.id]);
    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao deletar movimentação');
  }
};

exports.filtrarForm = (req, res) => {
  res.render('movimentacoes/filtrarMovimentacoes');
};

exports.filtrarMovimentacoes = async (req, res) => {
  const { dataInicio, dataFim } = req.body;

  try {
    const [movimentacoes] = await conectar.execute(`
      SELECT m.*, p.nome AS nome_produto,
      p.preco_venda,
      p.preco_custo,
      p.quantidade AS estoque_atual
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.usuario_id = ? AND m.data BETWEEN ? AND ?
      ORDER BY m.data DESC
    `, [ req.session.usuario.id ,dataInicio + ' 00:00:00', dataFim + ' 23:59:59']);

    res.render('movimentacoes/listarMovimentacoes', { movimentacoes });
  } catch (erro) {
    console.error('Erro ao filtrar movimentações:', erro);
    res.status(500).send('Erro ao gerar relatório');
  }
};

