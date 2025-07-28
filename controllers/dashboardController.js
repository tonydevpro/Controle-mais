const conectar = require('../banco/conexao');

const { Parser } = require('json2csv');

const PDFDocument = require('pdfkit');

exports.exportarPDF = async (req, res) => {
  const usuario_id = req.session.usuario.id;
  const { dataInicio, dataFim } = req.query;

  try {
    const [movs] = await conectar.execute(
      `SELECT m.data, p.nome AS produto, m.tipo, m.quantidade, m.desconto, m.observacao 
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.usuario_id = ? AND m.data BETWEEN ? AND ?
       ORDER BY m.data`,
      [usuario_id, dataInicio, dataFim]
    );

    const doc = new PDFDocument();
    const nomeArquivo = `relatorio_movimentacoes_${Date.now()}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename=${nomeArquivo}`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(16).text('Relatório de Movimentações', { align: 'center' });
    doc.moveDown();

    // Cabeçalhos
    doc.font('Helvetica-Bold');
    doc.text('Data', 30, doc.y, { continued: true, width: 70 });
    doc.text('Produto', 100, doc.y, { continued: true, width: 120 });
    doc.text('Tipo', 220, doc.y, { continued: true, width: 50 });
    doc.text('Qtd', 270, doc.y, { continued: true, width: 40 });
    doc.text('Desc.', 310, doc.y, { continued: true, width: 50 }); // Novo
    doc.text('Obs', 360, doc.y);
    doc.moveDown();
    doc.font('Helvetica');

    // Conteúdo
    movs.forEach(m => {
      doc.text(m.data, 30, doc.y, { continued: true, width: 70 });
      doc.text(m.produto, 100, doc.y, { continued: true, width: 120 });
      doc.text(m.tipo, 220, doc.y, { continued: true, width: 50 });
      doc.text(m.quantidade.toString(), 270, doc.y, { continued: true, width: 40 });
      doc.text(m.desconto?.toFixed(2) || '0.00', 310, doc.y, { continued: true, width: 50 }); // Novo
      doc.text(m.observacao || '', 360, doc.y);
    });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF.');
  }
};



exports.exportarCSV = async (req, res) => {
  const usuario_id = req.session.usuario.id;
  const { dataInicio, dataFim } = req.query;

  try {
    const [movs] = await conectar.execute(
      `SELECT m.data, p.nome AS produto, m.tipo, m.quantidade, m.desconto, m.observacao 
       FROM movimentacoes m
       JOIN produtos p ON m.produto_id = p.id
       WHERE m.usuario_id = ? AND m.data BETWEEN ? AND ?
       ORDER BY m.data`,
      [usuario_id, dataInicio, dataFim]
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



exports.exibirDashboard = async (req, res) => {
  const { data_inicio, data_fim, produto_id, tipo } = req.query;

  let filtroData = '';
  let parametros = [];

  if (data_inicio && data_fim) {
    filtroData = 'WHERE m.usuario_id = ?';
    parametros.push(req.session.usuario.id);

  } else {
    filtroData = 'WHERE m.usuario_id = ? AND m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    parametros.push(req.session.usuario.id);
  }

  if (produto_id) {
    filtroData += filtroData.includes('WHERE') ? ' AND' : ' WHERE';
    filtroData += ' m.produto_id = ?';
    parametros.push(produto_id);
  }

  if (tipo) {
  filtroData += filtroData.includes('WHERE') ? ' AND' : ' WHERE';
  filtroData += ' m.tipo = ?';
  parametros.push(tipo);
}


  try {
    const [resumo] = await conectar.execute(`
      SELECT 
        COUNT(*) AS totalProdutos,
        SUM(quantidade) AS totalQuantidade,
        COALESCE(SUM(preco_custo * quantidade), 0) AS valorTotalCusto,
        COALESCE(SUM(preco_venda * quantidade), 0) AS valorTotalEstoque,
        COALESCE(SUM(preco_venda * quantidade) - SUM(preco_custo * quantidade), 0) AS lucroTotal
      FROM produtos
        WHERE usuario_id = ?
`, [req.session.usuario.id]);
    
    const [movimentacoes] = await conectar.execute(`
      SELECT 
        DATE(m.data) as data, 
        m.tipo, 
        SUM(m.quantidade) AS total
      FROM movimentacoes m
      where m.usuario_id = ? 
      ${data_inicio && data_fim ? 'AND m.data BETWEEN ? AND ?' : 'AND m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)'}
      GROUP BY DATE(m.data), m.tipo
      ORDER BY DATE(m.data)
    `, [req.session.usuario.id, ...(data_inicio && data_fim ? [data_inicio, data_fim] : [])]);

    const [movimentacoesDetalhadas] = await conectar.execute(`
  SELECT 
    m.data, 
    p.nome AS produto, 
    m.tipo, 
    m.quantidade, 
    m.observacao
  FROM movimentacoes m
  JOIN produtos p ON m.produto_id = p.id
  ${filtroData}
  ORDER BY m.data DESC
`, parametros);


    const [produtos] = await conectar.execute(`SELECT id, nome FROM produtos WHERE usuario_id = ?`, [req.session.usuario.id]);

    res.render('dashboard/dashboard', {
      totalProdutos: resumo[0].totalProdutos || 0,
      totalQuantidade: resumo[0].totalQuantidade || 0,
      valorTotalEstoque: resumo[0].valorTotalEstoque ? Number(resumo[0].valorTotalEstoque) : 0,
      valorTotalCusto: resumo[0].valorTotalCusto ? Number(resumo[0].valorTotalCusto) : 0,
      lucroTotal: resumo[0].lucroTotal ? Number(resumo[0].lucroTotal) : 0,
      movimentacoes,
      movimentacoesDetalhadas,
      produtos,
      data_inicio,
      data_fim,
      produto_id,
      tipo
    });

  } catch (erro) {
    console.error('❌ Erro ao carregar o dashboard:', erro);
    res.status(500).send(`Erro ao carregar o painel: ${erro.message}`);
  }
};


exports.dashboardFinanceiro = async (req, res) => {
  const { data_inicio, data_fim } = req.query;

  let filtroData = '';
  let parametros = [req.session.usuario.id];

  if (data_inicio && data_fim) {
    filtroData = 'AND m.data BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)';
    parametros.push(data_inicio, data_fim);
  }

  try {
    const [movs] = await conectar.execute(`
      SELECT 
        m.quantidade,
        m.tipo,
        p.preco_custo,
        p.preco_venda,
        m.desconto
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.usuario_id = ? ${filtroData}
    `, parametros);

    let totalEntrada = 0;
    let totalSaida = 0;
    let totalBruto = 0;
    let totalCusto = 0;

    movs.forEach(m => {
      const quantidade = m.quantidade;
      const precoVenda = Number(m.preco_venda);
      const precoCusto = Number(m.preco_custo);
      const desconto = Number(m.desconto) || 0;

      if (m.tipo === 'entrada') {
        totalEntrada += quantidade;
      } else if (m.tipo === 'saida') {
        totalSaida += quantidade;
        totalBruto += (quantidade * precoVenda) - desconto;
        totalCusto += quantidade * precoCusto;
      }
    });
    
    console.log('Total Bruto:', totalBruto);
    console.log('Total Custo:', totalCusto);

    const lucroLiquido = totalBruto - totalCusto;
    const margemLucro = totalCusto > 0 ? ((lucroLiquido / totalCusto) * 100).toFixed(2) : 0;

    // Para exibir a margem por produto (baseado no cadastro)
    const [produtos] = await conectar.execute(
      'SELECT nome, preco_custo, preco_venda FROM produtos WHERE usuario_id = ?',
      [req.session.usuario.id]
    );

    const [estoque] = await conectar.execute(
  'SELECT SUM(quantidade) AS totalEstoque FROM produtos WHERE usuario_id = ?',
  [req.session.usuario.id]
);

const totalEstoque = estoque[0].totalEstoque || 0;


    const produtosComMargem = produtos.map(prod => {
      const margem = ((prod.preco_venda - prod.preco_custo) / prod.preco_venda * 100).toFixed(2);
      return {
        nome: prod.nome,
        preco_custo: Number(prod.preco_custo),
        preco_venda: Number(prod.preco_venda),
        margem
      };
    });

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


exports.exibirDashboardPrincipal = async (req, res) => {
  try {
    // Verifica se o usuário está logado
    if (!req.session || !req.session.usuario) {
      return res.redirect('/login');
}

    const usuarioId = req.session.usuario.id;

    // Vendas
    const [vendasDia] = await conectar.execute(`
      SELECT SUM(total) AS total FROM vendas 
      WHERE usuario_id = ? AND DATE(data) = CURDATE()
    `, [usuarioId]);

    const [vendasSemana] = await conectar.execute(`
      SELECT SUM(total) AS total FROM vendas 
      WHERE usuario_id = ? AND YEARWEEK(data, 1) = YEARWEEK(CURDATE(), 1)
    `, [usuarioId]);

    const [vendasMes] = await conectar.execute(`
      SELECT SUM(total) AS total FROM vendas 
      WHERE usuario_id = ? AND MONTH(data) = MONTH(CURDATE()) AND YEAR(data) = YEAR(CURDATE())
    `, [usuarioId]);

    // Lucro total (saídas)
    const [movsSaida] = await conectar.execute(`
      SELECT 
        m.quantidade, 
        p.preco_custo, 
        p.preco_venda,
        m.desconto 
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.usuario_id = ? AND m.tipo = 'saida'
    `, [usuarioId]);

    let totalBruto = 0;
    let totalCusto = 0;

    movsSaida.forEach(m => {
      const qtd = m.quantidade;
      const desconto = Number(m.desconto) || 0;
      totalBruto += ((qtd * Number(m.preco_venda)) - desconto);
      totalCusto += qtd * Number(m.preco_custo);
    });

    const lucroTotal = totalBruto - totalCusto;

    // Total entrada e saída (quantitativo)
    const [totalEntrada] = await conectar.execute(`
      SELECT SUM(quantidade) AS total FROM movimentacoes 
      WHERE usuario_id = ? AND tipo = 'entrada'
    `, [usuarioId]);

    const [totalSaida] = await conectar.execute(`
      SELECT SUM(quantidade) AS total FROM movimentacoes 
      WHERE usuario_id = ? AND tipo = 'saida'
    `, [usuarioId]);

    // Produtos mais vendidos
    const [maisVendidos] = await conectar.execute(`
      SELECT p.nome, SUM(iv.quantidade) AS total_vendido
      FROM itens_venda iv
      JOIN produtos p ON p.id = iv.produto_id
      JOIN vendas v ON v.id = iv.venda_id
      WHERE v.usuario_id = ?
      GROUP BY p.nome
      ORDER BY total_vendido DESC
      LIMIT 5
    `, [usuarioId]);

    // Resumo do estoque
    const [estoqueResumo] = await conectar.execute(`
      SELECT 
        COUNT(*) AS totalProdutos, 
        SUM(quantidade) AS totalEstoque 
      FROM produtos 
      WHERE usuario_id = ?
    `, [usuarioId]);

    const [abaixoMinimo] = await conectar.execute(`
      SELECT COUNT(*) AS abaixo FROM produtos 
      WHERE usuario_id = ? AND quantidade <= estoque_minimo
    `, [usuarioId]);

    // Caixa do dia
    const [caixa] = await conectar.execute(`
      SELECT
        SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END) AS dinheiro,
        SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END) AS pix
      FROM vendas
      WHERE usuario_id = ? AND DATE(data) = CURDATE()
    `, [usuarioId]);

    // Últimas movimentações
    const [ultimasMovs] = await conectar.execute(`
      SELECT 
        DATE_FORMAT(m.data, '%d/%m/%Y %H:%i') AS data,
        p.nome AS produto,
        m.tipo,
        m.quantidade,
        m.observacao
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.usuario_id = ?
      ORDER BY m.data DESC
      LIMIT 5
    `, [usuarioId]);

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

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');


