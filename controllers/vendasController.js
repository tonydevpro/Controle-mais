const conectar = require('../banco/conexao');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// =======================
// Listar vendas
// =======================
exports.listarVendas = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;
    const [vendas] = await conectar.execute(
      'SELECT id, total, data FROM vendas WHERE loja_id = ? ORDER BY data DESC',
      [loja_id]
    );

    vendas.forEach(v => v.total = parseFloat(v.total));
    res.render('vendas/lista', { vendas });
  } catch (err) {
    console.error('Erro ao listar vendas:', err);
    res.status(500).send('Erro ao carregar vendas.');
  }
};

// =======================
// Detalhar uma venda
// =======================
exports.detalharVenda = async (req, res) => {
  const vendaId = req.params.id;
  const loja_id = req.session.usuario.loja_id;

  try {
    const [[venda]] = await conectar.execute(
      'SELECT id, total, data, forma_pagamento FROM vendas WHERE id = ? AND loja_id = ?',
      [vendaId, loja_id]
    );

    if (!venda) return res.status(404).send('Venda não encontrada');

    const [itens] = await conectar.execute(`
      SELECT p.nome, iv.quantidade, iv.preco_unitario, iv.desconto
      FROM itens_venda iv
      JOIN produtos p ON p.id = iv.produto_id
      JOIN vendas v ON iv.venda_id = v.id
      WHERE iv.venda_id = ? AND v.loja_id = ?`,
      [vendaId, loja_id]
    );

    res.render('vendas/detalhe', { venda, itens });
  } catch (err) {
    console.error('Erro ao detalhar venda:', err);
    res.status(500).send('Erro ao carregar detalhes da venda.');
  }
};

// =======================
// Excluir venda
// =======================
exports.excluirVenda = async (req, res) => {
  const vendaId = req.params.id;
  const loja_id = req.session.usuario.loja_id;

  try {
    // Deletar apenas itens pertencentes à mesma loja
    await conectar.execute(`
      DELETE iv
      FROM itens_venda iv
      JOIN vendas v ON iv.venda_id = v.id
      WHERE iv.venda_id = ? AND v.loja_id = ?`,
      [vendaId, loja_id]
    );

    // Deletar a venda
    await conectar.execute('DELETE FROM vendas WHERE id = ? AND loja_id = ?', [vendaId, loja_id]);

    res.redirect('/vendas');
  } catch (err) {
    console.error('Erro ao excluir venda:', err);
    res.status(500).send('Erro ao excluir a venda.');
  }
};

// =======================
// Relatório (view)
// =======================
exports.exibirRelatorio = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;

  try {
    const [totaisDia] = await conectar.execute(`
      SELECT DATE(data) AS dia, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 7 DAY
      GROUP BY dia ORDER BY dia DESC
    `, [loja_id]);

    const [totaisSemana] = await conectar.execute(`
      SELECT YEARWEEK(data, 1) AS semana, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 28 DAY
      GROUP BY semana ORDER BY semana DESC
    `, [loja_id]);

    const [totaisMes] = await conectar.execute(`
      SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 1 YEAR
      GROUP BY mes ORDER BY mes DESC
    `, [loja_id]);

    const [totaisAno] = await conectar.execute(`
      SELECT YEAR(data) AS ano, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ?
      GROUP BY ano ORDER BY ano DESC LIMIT 5
    `, [loja_id]);

    res.render('vendas/relatorio', { totaisDia, totaisSemana, totaisMes, totaisAno });
  } catch (err) {
    console.error('Erro ao carregar relatório:', err);
    res.status(500).send('Erro ao carregar relatório.');
  }
};

// =======================
// Gerar PDF de relatório
// =======================
exports.gerarPDF = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;

  try {
    const [totaisDia] = await conectar.execute(`
      SELECT DATE(data) AS dia, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 7 DAY
      GROUP BY dia ORDER BY dia DESC
    `, [loja_id]);

    const [totaisSemana] = await conectar.execute(`
      SELECT YEARWEEK(data, 1) AS semana, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 28 DAY
      GROUP BY semana ORDER BY semana DESC
    `, [loja_id]);

    const [totaisMes] = await conectar.execute(`
      SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ? AND data >= CURDATE() - INTERVAL 1 YEAR
      GROUP BY mes ORDER BY mes DESC
    `, [loja_id]);

    const [totaisAno] = await conectar.execute(`
      SELECT YEAR(data) AS ano, SUM(total) AS total
      FROM vendas
      WHERE loja_id = ?
      GROUP BY ano ORDER BY ano DESC LIMIT 5
    `, [loja_id]);

    const doc = new PDFDocument({ margin: 50 });
    const nomeArquivo = `relatorio-${Date.now()}.pdf`;
    const caminho = path.join(__dirname, '../public/relatorios', nomeArquivo);
    const stream = fs.createWriteStream(caminho);
    doc.pipe(stream);

    doc.fontSize(20).text('Relatório de Vendas', { align: 'center' });
    doc.moveDown(1.5);

    const renderSecao = (titulo, dados, formatador) => {
      doc.fontSize(16).fillColor('#215a6d').text(titulo);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('black');
      dados.forEach(item => doc.text(formatador(item)));
      doc.moveDown(1);
    };

    renderSecao('Totais por Dia (Últimos 7 dias)', totaisDia, item =>
      `Dia: ${item.dia.toISOString().slice(0, 10)} - R$ ${parseFloat(item.total).toFixed(2)}`
    );
    renderSecao('Totais por Semana (Últimas 4 semanas)', totaisSemana, item =>
      `Semana: ${item.semana} - R$ ${parseFloat(item.total).toFixed(2)}`
    );
    renderSecao('Totais por Mês (Últimos 12 meses)', totaisMes, item =>
      `Mês: ${item.mes} - R$ ${parseFloat(item.total).toFixed(2)}`
    );
    renderSecao('Totais por Ano (Últimos 5 anos)', totaisAno, item =>
      `Ano: ${item.ano} - R$ ${parseFloat(item.total).toFixed(2)}`
    );

    doc.end();

    stream.on('finish', () => {
      res.download(caminho, nomeArquivo, err => {
        if (err) {
          console.error('Erro ao baixar o PDF:', err);
          res.status(500).send('Erro ao baixar o PDF.');
        } else {
          fs.unlinkSync(caminho);
        }
      });
    });
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    res.status(500).send('Erro ao gerar o PDF.');
  }
};

// =======================
// Gerar recibo PDF
// =======================
exports.gerarReciboPDF = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const vendaId = req.params.id;

  try {
    const [[venda]] = await conectar.execute(
      'SELECT id, total, data, forma_pagamento FROM vendas WHERE id = ? AND loja_id = ?',
      [vendaId, loja_id]
    );

    if (!venda) return console.log(`vendas:${venda}`), res.status(404).send('Venda não encontrada');

    const [itens] = await conectar.execute(`
      SELECT p.nome, iv.quantidade, iv.preco_unitario, iv.desconto
      FROM itens_venda iv
      JOIN produtos p ON p.id = iv.produto_id
      JOIN vendas v ON iv.venda_id = v.id
      WHERE iv.venda_id = ? AND v.loja_id = ?`,
      [vendaId, loja_id]
    );

    const total = Number(venda.total) || 0;
    const dataVenda = venda.data ? new Date(venda.data).toLocaleString() : '-';
    const formaPagamento = venda.forma_pagamento || '---';

    const doc = new PDFDocument({ margin: 20, size: [300, 600] });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=recibo-${vendaId}.pdf`);
    doc.pipe(res);

    doc.fontSize(14).text('Controle+', { align: 'center', bold: true });
    doc.fontSize(10).text('Sistema de Vendas e Estoque', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Venda nº: ${venda.id}`);
    doc.text(`Data: ${dataVenda}`);
    doc.text(`Forma de Pagamento: ${formaPagamento}`);
    doc.moveDown(0.5);

    doc.fontSize(11).text('Itens:', { underline: true });
    doc.fontSize(10).text(`Produto       Qtd   R$und   Desc   Subtotal`);
    itens.forEach(item => {
      const preco = Number(item.preco_unitario) || 0;
      const desconto = Number(item.desconto) || 0;
      const quantidade = Number(item.quantidade) || 0;
      const subtotal = (preco * quantidade) - desconto;
      const linha = `${item.nome.padEnd(12).slice(0, 12)}  ${quantidade.toString().padStart(3)}  ${preco.toFixed(2).padStart(6)}  ${desconto.toFixed(2).padStart(5)}  ${subtotal.toFixed(2).padStart(7)}`;
      doc.text(linha);
    });

    doc.moveDown(0.3);
    doc.fontSize(11).text(`TOTAL: R$ ${total.toFixed(2)}`, { align: 'right', bold: true });

    doc.moveDown(1);
    doc.fontSize(10).text('Obrigado pela preferência!', { align: 'center', italic: true });
    doc.fontSize(8).text('https://controle-mais-production.up.railway.app/', { align: 'center', color: '#666' });

    doc.end();
  } catch (err) {
    console.error('Erro ao gerar recibo PDF:', err);
    res.status(500).send('Erro ao gerar recibo.');
  }
};
