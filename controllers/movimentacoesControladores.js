const conectar = require('../banco/conexao');
const { atualizarEstoque } = require('./utilsController');

// Exibir formulário para adicionar movimentação
exports.adicionarMovimentacoes = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;
    const [produtos] = await conectar.execute(
      'SELECT id, nome FROM produtos WHERE loja_id = ? AND ativo = 1 ORDER BY nome',
      [loja_id]
    );
    res.render('movimentacoes/adicionarMovimentacoes', { produtos });
  } catch (erro) {
    console.error('Erro ao carregar formulário de movimentação:', erro);
    res.status(500).send('Erro ao carregar formulário de movimentação');
  }
};

// Registrar nova movimentação
exports.registrar = async (req, res) => {
  const { produto_id, tipo, quantidade, observacao, desconto } = req.body;
  const usuario_id = req.session.usuario.id;
  const loja_id = req.session.usuario.loja_id;

  try {
    await conectar.execute(
      'INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, desconto, usuario_id, loja_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [produto_id, tipo, quantidade, observacao, desconto || 0, usuario_id, loja_id]
    );

    await atualizarEstoque(produto_id, quantidade, tipo, loja_id);
    res.redirect('/produtos');
  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    res.status(500).send('Erro ao registrar movimentação');
  }
};

// Listar todas movimentações da loja
exports.listarMovimentacoes = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;
    const [movimentacoes] = await conectar.execute(
      `SELECT m.*, p.nome AS nome_produto, p.preco_custo, p.preco_venda
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.loja_id = ?
       ORDER BY m.data DESC`,
      [loja_id]
    );
    res.render('movimentacoes/listarMovimentacoes', { movimentacoes });
  } catch (erro) {
    console.error('Erro ao buscar movimentações:', erro);
    res.status(500).send('Erro ao buscar movimentações');
  }
};

// Formulário para editar movimentação
exports.formEditarMov = async (req, res) => {
  try {
    const idMov = req.params.id;
    const loja_id = req.session.usuario.loja_id;

    const [resultado] = await conectar.execute(
      'SELECT * FROM movimentacoes WHERE id = ? AND loja_id = ?',
      [idMov, loja_id]
    );
    if (resultado.length === 0) return res.status(404).send('Movimentação não encontrada');

    const [produtos] = await conectar.execute(
      'SELECT id, nome FROM produtos WHERE loja_id = ? AND ativo = 1 ORDER BY nome',
      [loja_id]
    );

    res.render('movimentacoes/formEditarMovimentacao', { movimentacao: resultado[0], produtos });
  } catch (erro) {
    console.error('Erro ao carregar formulário de edição:', erro);
    res.status(500).send('Erro ao carregar formulário de edição');
  }
};

// Atualizar movimentação com controle de estoque
exports.atualizarMov = async (req, res) => {
  try {
    const idMov = req.params.id;
    const loja_id = req.session.usuario.loja_id;
    const { produto_id, tipo, quantidade, observacao, desconto } = req.body;

    // Buscar movimentação antiga
    const [verifica] = await conectar.execute(
      'SELECT * FROM movimentacoes WHERE id = ? AND loja_id = ?',
      [idMov, loja_id]
    );
    if (verifica.length === 0) return res.status(403).send('Acesso negado');

    const movAntiga = verifica[0];

    // Reverter estoque da movimentação antiga
    const operadorReverso = movAntiga.tipo === 'entrada' ? '-' : '+';
    await conectar.execute(
      `UPDATE produtos SET quantidade = quantidade ${operadorReverso} ? WHERE id = ? AND loja_id = ? AND ativo = 1`,
      [movAntiga.quantidade, movAntiga.produto_id, loja_id]
    );

    // Atualizar movimentação
    await conectar.execute(
      'UPDATE movimentacoes SET produto_id = ?, tipo = ?, quantidade = ?, observacao = ?, desconto = ? WHERE id = ? AND loja_id = ?',
      [produto_id, tipo, quantidade, observacao, desconto || 0, idMov, loja_id]
    );

    // Aplicar estoque da nova movimentação
    const operadorNovo = tipo === 'entrada' ? '+' : '-';
    await conectar.execute(
      `UPDATE produtos SET quantidade = quantidade ${operadorNovo} ? WHERE id = ? AND loja_id = ? AND ativo = 1`,
      [quantidade, produto_id, loja_id]
    );

    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error('Erro ao atualizar movimentação:', erro);
    res.status(500).send('Erro ao atualizar movimentação');
  }
};

// Deletar movimentação com ajuste de estoque
exports.deletarMov = async (req, res) => {
  try {
    const idMov = req.params.id;
    const loja_id = req.session.usuario.loja_id;

    const [verifica] = await conectar.execute(
      'SELECT * FROM movimentacoes WHERE id = ? AND loja_id = ?',
      [idMov, loja_id]
    );
    if (verifica.length === 0) return res.status(403).send('Acesso negado');

    const mov = verifica[0];

    // Reverter estoque
    const operadorReverso = mov.tipo === 'entrada' ? '-' : '+';
    await conectar.execute(
      `UPDATE produtos SET quantidade = quantidade ${operadorReverso} ? WHERE id = ? AND loja_id = ? AND ativo = 1`,
      [mov.quantidade, mov.produto_id, loja_id]
    );

    await conectar.execute('DELETE FROM movimentacoes WHERE id = ? AND loja_id = ?', [idMov, loja_id]);
    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error('Erro ao deletar movimentação:', erro);
    res.status(500).send('Erro ao deletar movimentação');
  }
};

// Formulário para filtro de movimentações
exports.filtrarForm = (req, res) => {
  res.render('movimentacoes/filtrarMovimentacoes');
};


// Filtrar movimentações por data
exports.filtrarMovimentacoes = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;
    const { dataInicio, dataFim } = req.body;

    const [movimentacoes] = await conectar.execute(
      `SELECT m.*, p.nome AS nome_produto, p.preco_venda, p.preco_custo, p.quantidade AS estoque_atual
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.loja_id = ? AND m.data BETWEEN ? AND ?
       ORDER BY m.data DESC`,
      [loja_id, `${dataInicio} 00:00:00`, `${dataFim} 23:59:59`]
    );

    res.render('movimentacoes/listarMovimentacoes', { movimentacoes });
  } catch (erro) {
    console.error('Erro ao filtrar movimentações:', erro);
    res.status(500).send('Erro ao gerar relatório');
  }
};
