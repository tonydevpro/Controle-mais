const conectar = require('../banco/conexao');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// =======================
// Exportar movimentações em PDF
// =======================
exports.exportarPDF = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const { dataInicio, dataFim } = req.query;

  try {
    // Histórico -> mantém todos, inclusive inativos
    const [movs] = await conectar.execute(
      `SELECT m.data, p.nome AS produto, m.tipo, m.quantidade, m.desconto, m.observacao 
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.loja_id = ? AND m.data BETWEEN ? AND ?
       ORDER BY m.data`,
      [loja_id, dataInicio, dataFim]
    );

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const nomeArquivo = `relatorio_movimentacoes_${Date.now()}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename=${nomeArquivo}`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(16).text('Relatório de Movimentações', { align: 'center' });
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text('Data', 30, doc.y, { continued: true, width: 70 });
    doc.text('Produto', 100, doc.y, { continued: true, width: 120 });
    doc.text('Tipo', 220, doc.y, { continued: true, width: 50 });
    doc.text('Qtd', 270, doc.y, { continued: true, width: 40 });
    doc.text('Desc.', 310, doc.y, { continued: true, width: 50 });
    doc.text('Obs', 360, doc.y);
    doc.moveDown();
    doc.font('Helvetica');

    movs.forEach(m => {
      doc.text(m.data, 30, doc.y, { continued: true, width: 70 });
      doc.text(m.produto, 100, doc.y, { continued: true, width: 120 });
      doc.text(m.tipo, 220, doc.y, { continued: true, width: 50 });
      doc.text(m.quantidade.toString(), 270, doc.y, { continued: true, width: 40 });
      doc.text(m.desconto?.toFixed(2) || '0.00', 310, doc.y, { continued: true, width: 50 });
      doc.text(m.observacao || '', 360, doc.y);
    });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF.');
  }
};

// =======================
// Exportar movimentações em CSV
// =======================
exports.exportarCSV = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const { dataInicio, dataFim } = req.query;

  try {
    // Histórico -> mantém todos, inclusive inativos
    const [movs] = await conectar.execute(
      `SELECT m.data, p.nome AS produto, m.tipo, m.quantidade, m.desconto, m.observacao 
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.loja_id = ? AND m.data BETWEEN ? AND ?
       ORDER BY m.data`,
      [loja_id, dataInicio, dataFim]
    );

    const parser = new Parser({ fields: ['data', 'produto', 'tipo', 'quantidade', 'desconto', 'observacao'] });
    const csv = parser.parse(movs);

    const nomeArquivo = `relatorio_movimentacoes_${Date.now()}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(nomeArquivo);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao gerar CSV:', error);
    res.status(500).send('Erro ao gerar CSV.');
  }
};

// =======================
// Dashboard detalhado
// =======================
exports.exibirDashboard = async (req, res) => {
  const { data_inicio, data_fim, produto_id, tipo } = req.query;
  const loja_id = req.session.usuario.loja_id;

  let filtroData = 'WHERE m.loja_id = ?';
  const parametros = [loja_id];

  if (data_inicio && data_fim) {
    filtroData += ' AND m.data BETWEEN ? AND ?';
    parametros.push(data_inicio, data_fim);
  } else {
    filtroData += ' AND m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  }

  if (produto_id) {
    filtroData += ' AND m.produto_id = ?';
    parametros.push(produto_id);
  }

  if (tipo) {
    filtroData += ' AND m.tipo = ?';
    parametros.push(tipo);
  }

  try {
    // Estoque atual -> apenas produtos ativos
    const [resumo] = await conectar.execute(`
      SELECT 
        COUNT(*) AS totalProdutos,
        SUM(quantidade) AS totalQuantidade,
        COALESCE(SUM(preco_custo * quantidade), 0) AS valorTotalCusto,
        COALESCE(SUM(preco_venda * quantidade), 0) AS valorTotalEstoque,
        COALESCE(SUM(preco_venda * quantidade) - SUM(preco_custo * quantidade), 0) AS lucroTotal
      FROM produtos
      WHERE loja_id = ? AND ativo = 1
    `, [loja_id]);

    // Histórico -> mantém todos
    const [movimentacoes] = await conectar.execute(`
      SELECT DATE(m.data) as data, m.tipo, SUM(m.quantidade) AS total
      FROM movimentacoes m
      WHERE m.loja_id = ?
      ${data_inicio && data_fim ? 'AND m.data BETWEEN ? AND ?' : 'AND m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)'}
      GROUP BY DATE(m.data), m.tipo
      ORDER BY DATE(m.data)
    `, [loja_id, ...(data_inicio && data_fim ? [data_inicio, data_fim] : [])]);

    const [movimentacoesDetalhadas] = await conectar.execute(`
      SELECT m.data, p.nome AS produto, m.tipo, m.quantidade, m.observacao
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      ${filtroData}
      ORDER BY m.data DESC
    `, parametros);

    // Produtos para filtro -> apenas ativos
    const [produtos] = await conectar.execute(
      'SELECT id, nome FROM produtos WHERE loja_id = ? AND ativo = 1',
      [loja_id]
    );

    res.render('dashboard/dashboard', {
      totalProdutos: resumo[0].totalProdutos || 0,
      totalQuantidade: resumo[0].totalQuantidade || 0,
      valorTotalEstoque: Number(resumo[0].valorTotalEstoque) || 0,
      valorTotalCusto: Number(resumo[0].valorTotalCusto) || 0,
      lucroTotal: Number(resumo[0].lucroTotal) || 0,
      movimentacoes,
      movimentacoesDetalhadas,
      produtos,
      data_inicio,
      data_fim,
      produto_id,
      tipo
    });
  } catch (erro) {
    console.error('Erro ao carregar o dashboard:', erro);
    res.status(500).send(`Erro ao carregar o painel: ${erro.message}`);
  }
};

// =======================
// Dashboard financeiro
// =======================
exports.dashboardFinanceiro = async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const loja_id = req.session.usuario.loja_id;

  let filtroData = '';
  const parametros = [loja_id];

  if (data_inicio && data_fim) {
    filtroData = 'AND m.data BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)';
    parametros.push(data_inicio, data_fim);
  }

  try {
    // Histórico -> movimentações incluem todos
    const [movs] = await conectar.execute(`
      SELECT m.quantidade, m.tipo, p.preco_custo, p.preco_venda, m.desconto
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.loja_id = ? ${filtroData}
    `, parametros);

    let totalEntrada = 0;
    let totalSaida = 0;
    let totalBruto = 0;
    let totalCusto = 0;

    movs.forEach(m => {
      const qtd = m.quantidade;
      const desconto = Number(m.desconto) || 0;
      if (m.tipo === 'entrada') totalEntrada += qtd;
      else if (m.tipo === 'saida') {
        totalSaida += qtd;
        totalBruto += (qtd * Number(m.preco_venda)) - desconto;
        totalCusto += qtd * Number(m.preco_custo);
      }
    });

    const lucroLiquido = totalBruto - totalCusto;
    const margemLucro = totalCusto > 0 ? ((lucroLiquido / totalCusto) * 100).toFixed(2) : 0;

    // Estoque atual -> só ativos
    const [produtos] = await conectar.execute(
      'SELECT nome, preco_custo, preco_venda FROM produtos WHERE loja_id = ? AND ativo = 1',
      [loja_id]
    );
    const [estoque] = await conectar.execute(
      'SELECT SUM(quantidade) AS totalEstoque FROM produtos WHERE loja_id = ? AND ativo = 1',
      [loja_id]
    );
    const totalEstoque = estoque[0].totalEstoque || 0;

    const produtosComMargem = produtos.map(prod => ({
      nome: prod.nome,
      preco_custo: Number(prod.preco_custo),
      preco_venda: Number(prod.preco_venda),
      margem: ((prod.preco_venda - prod.preco_custo) / prod.preco_venda * 100).toFixed(2)
    }));

    res.render('dashboard/dashboardFinanceiro', {
      totalEntrada,
      totalSaida,
      totalBruto,
      totalCusto,
      lucroLiquido,
      margemLucro,
      produtosComMargem,
      data_inicio,
      data_fim,
      totalEstoque
    });
  } catch (erro) {
    console.error('Erro ao carregar dashboard financeiro:', erro);
    res.status(500).send('Erro ao carregar dashboard');
  }
};

// =======================
// Dashboard principal
// =======================
exports.exibirDashboardPrincipal = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) return res.redirect('/login');
    const loja_id = req.session.usuario.loja_id;

    const [vendasDia] = await conectar.execute('SELECT SUM(total) AS total FROM vendas WHERE loja_id = ? AND DATE(data) = CURDATE()', [loja_id]);
    const [vendasSemana] = await conectar.execute('SELECT SUM(total) AS total FROM vendas WHERE loja_id = ? AND YEARWEEK(data, 1) = YEARWEEK(CURDATE(), 1)', [loja_id]);
    const [vendasMes] = await conectar.execute('SELECT SUM(total) AS total FROM vendas WHERE loja_id = ? AND MONTH(data) = MONTH(CURDATE()) AND YEAR(data) = YEAR(CURDATE())', [loja_id]);

    const [movsSaida] = await conectar.execute(`
      SELECT m.quantidade, p.preco_custo, p.preco_venda, m.desconto
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.loja_id = ? AND m.tipo = 'saida'
    `, [loja_id]);

    let totalBruto = 0;
    let totalCusto = 0;
    movsSaida.forEach(m => {
      const qtd = m.quantidade;
      const desconto = Number(m.desconto) || 0;
      totalBruto += ((qtd * Number(m.preco_venda)) - desconto);
      totalCusto += qtd * Number(m.preco_custo);
    });

    const lucroTotal = totalBruto - totalCusto;

    const [totalEntrada] = await conectar.execute('SELECT SUM(quantidade) AS total FROM movimentacoes WHERE loja_id = ? AND tipo = "entrada"', [loja_id]);
    const [totalSaida] = await conectar.execute('SELECT SUM(quantidade) AS total FROM movimentacoes WHERE loja_id = ? AND tipo = "saida"', [loja_id]);

    const [maisVendidos] = await conectar.execute(`
      SELECT p.nome, SUM(iv.quantidade) AS total_vendido
      FROM itens_venda iv
      JOIN produtos p ON p.id = iv.produto_id AND p.loja_id = ?
      JOIN vendas v ON v.id = iv.venda_id AND v.loja_id = ?
      GROUP BY p.nome
      ORDER BY total_vendido DESC
      LIMIT 5
    `, [loja_id, loja_id]);

    // Estoque atual -> só ativos
    const [estoqueResumo] = await conectar.execute('SELECT COUNT(*) AS totalProdutos, SUM(quantidade) AS totalEstoque FROM produtos WHERE loja_id = ? AND ativo = 1', [loja_id]);
    const [abaixoMinimo] = await conectar.execute('SELECT COUNT(*) AS abaixo FROM produtos WHERE loja_id = ? AND ativo = 1 AND quantidade <= estoque_minimo', [loja_id]);

    const [caixa] = await conectar.execute(`
      SELECT
        SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END) AS dinheiro,
        SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END) AS pix
      FROM vendas
      WHERE loja_id = ? AND DATE(data) = CURDATE()
    `, [loja_id]);

    const [ultimasMovs] = await conectar.execute(`
      SELECT DATE_FORMAT(m.data, '%d/%m/%Y %H:%i') AS data, p.nome AS produto, m.tipo, m.quantidade, m.observacao
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.loja_id = ?
      ORDER BY m.data DESC
      LIMIT 5
    `, [loja_id]);

    res.render('dashboard/dashboardPrincipal', {
      vendasDia: Number(vendasDia[0].total) || 0,
      vendasSemana: Number(vendasSemana[0].total) || 0,
      vendasMes: Number(vendasMes[0].total) || 0,
      lucroTotal: Number(lucroTotal) || 0,
      totalEntrada: Number(totalEntrada[0].total) || 0,
      totalSaida: Number(totalSaida[0].total) || 0,
      maisVendidos,
      totalProdutos: Number(estoqueResumo[0].totalProdutos) || 0,
      totalEstoque: Number(estoqueResumo[0].totalEstoque) || 0,
      abaixoMinimo: Number(abaixoMinimo[0].abaixo) || 0,
      caixa: {
        dinheiro: Number(caixa[0].dinheiro) || 0,
        pix: Number(caixa[0].pix) || 0
      },
      ultimasMovs
    });
  } catch (erro) {
    console.error('Erro ao carregar dashboard principal:', erro);
    res.status(500).send('Erro ao carregar o painel principal.');
  }
};
