const conectar = require('../banco/conexao');

const { Parser } = require('json2csv');

const PDFDocument = require('pdfkit');

exports.exportarPDF = async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let filtroData = '';
  let parametros = [];

  if (data_inicio && data_fim) {
    filtroData = 'WHERE m.usuario_id = ? AND m.data BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)';
    parametros.push(req.session.usuario.id, data_inicio, data_fim);

  } else {
    filtroData = 'WHERE m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  }

  try {
    const [movs] = await conectar.execute(`
      SELECT 
        DATE_FORMAT(m.data, '%d/%m/%Y') AS data,
        p.nome AS produto,
        m.tipo,
        m.quantidade,
        m.observacao
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      ${filtroData}
      ORDER BY m.data DESC
    `, parametros);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Relatório de Movimentações - Controle+', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text(`Período: ${data_inicio || 'últimos 7 dias'} até ${data_fim || 'hoje'}`);
    doc.moveDown(0.5);

    // Cabeçalho da tabela
    doc.font('Helvetica-Bold');
    doc.text('Data', 30, doc.y, { continued: true, width: 80 });
    doc.text('Produto', 110, doc.y, { continued: true, width: 150 });
    doc.text('Tipo', 260, doc.y, { continued: true, width: 60 });
    doc.text('Qtd', 320, doc.y, { continued: true, width: 50 });
    doc.text('Obs', 370, doc.y);
    doc.font('Helvetica');

    doc.moveDown(0.3);

    movs.forEach(m => {
      doc.text(m.data, 30, doc.y, { continued: true, width: 80 });
      doc.text(m.produto, 110, doc.y, { continued: true, width: 150 });
      doc.text(m.tipo, 260, doc.y, { continued: true, width: 60 });
      doc.text(m.quantidade.toString(), 320, doc.y, { continued: true, width: 50 });
      doc.text(m.observacao || '', 370, doc.y);
    });

    doc.end();
  } catch (erro) {
    console.error('Erro ao exportar PDF:', erro);
    res.status(500).send('Erro ao gerar PDF.');
  }
};


exports.exportarCSV = async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let filtroData = '';
  let parametros = [];

  if (data_inicio && data_fim) {
    filtroData = 'WHERE m.usuario_id = ? AND m.data BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)';
    parametros.push(req.session.usuario.id, data_inicio, data_fim);

  } else {
    filtroData = 'WHERE m.data >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  }

  try {
    const [movs] = await conectar.execute(`
      SELECT 
        DATE_FORMAT(m.data, '%Y-%m-%d') AS data,
        p.nome AS produto,
        m.tipo,
        m.quantidade,
        m.observacao
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      ${filtroData}
      ORDER BY m.data DESC
    `, parametros);

    const parser = new Parser({ fields: ['data', 'produto', 'tipo', 'quantidade', 'observacao'] });
    const csv = parser.parse(movs);

    res.header('Content-Type', 'text/csv');
    res.attachment('movimentacoes.csv');
    res.send(csv);
  } catch (erro) {
    console.error('Erro ao exportar CSV:', erro);
    res.status(500).send('Erro ao exportar os dados.');
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
        p.preco_venda
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

      if (m.tipo === 'entrada') {
        totalEntrada += quantidade;
      } else if (m.tipo === 'saida') {
        totalSaida += quantidade;
        totalBruto += quantidade * precoVenda;
        totalCusto += quantidade * precoCusto;
      }
      console.log(quantidade);
    console.log(precoVenda);
    console.log(precoCusto);
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

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');


