const conectar = require('../banco/conexao');

exports.listarVendas = async (req, res) => {
  try {
    const [vendas] = await conectar.execute(
      'SELECT id, total, data FROM vendas WHERE usuario_id = ? ORDER BY data DESC',
      [req.session.usuario.id]
    );
    // Converter total para número, caso venha como string
    vendas.forEach(v => {
      v.total = parseFloat(v.total);
    });
    res.render('vendas/lista', { vendas });
  } catch (err) {
    console.error('Erro ao listar vendas:', err);
    res.status(500).send('Erro ao carregar vendas');
  }
};

exports.detalharVenda = async (req, res) => {
  const vendaId = req.params.id;
  const usuarioId = req.session.usuario.id;

  try {
    const [[venda]] = await conectar.execute(
      'SELECT id, total, data FROM vendas WHERE id = ? AND usuario_id = ?',
      [vendaId, usuarioId]
    );

    const [itens] = await conectar.execute(
      `SELECT p.nome, iv.quantidade, iv.preco_unitario, iv.desconto
       FROM itens_venda iv
       JOIN produtos p ON p.id = iv.produto_id
       WHERE iv.venda_id = ?`,
      [vendaId]
    );

    res.render('vendas/detalhe', { venda, itens });
  } catch (err) {
    console.error('Erro ao detalhar venda:', err);
    res.status(500).send('Erro ao carregar detalhes da venda');
  }
};

exports.excluirVenda = async (req, res) => {
  const vendaId = req.params.id;

  try {
    // Primeiro, apague os itens dessa venda (para manter integridade referencial)
    await conectar.execute('DELETE FROM itens_venda WHERE venda_id = ?', [vendaId]);

    // Depois, apague a venda
    await conectar.execute('DELETE FROM vendas WHERE id = ?', [vendaId]);

    res.redirect('/vendas'); // Redireciona para a lista depois de excluir
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao excluir a venda.');
  }
};

exports.exibirRelatorio = async (req, res) => {
  const usuarioId = req.session.usuario.id;
  try {
    // Total por dia (últimos 7 dias)
    const [totaisDia] = await conectar.execute(`
      SELECT DATE(data) AS dia, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 7 DAY
      GROUP BY dia ORDER BY dia DESC
    `, [usuarioId]);

    // Total por semana (últimas 4 semanas)
    const [totaisSemana] = await conectar.execute(`
      SELECT YEARWEEK(data, 1) AS semana, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 28 DAY
      GROUP BY semana ORDER BY semana DESC
    `, [usuarioId]);

    // Total por mês (últimos 12 meses)
    const [totaisMes] = await conectar.execute(`
      SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 1 YEAR
      GROUP BY mes ORDER BY mes DESC
    `, [usuarioId]);

    // Total por ano (últimos 5 anos)
    const [totaisAno] = await conectar.execute(`
      SELECT YEAR(data) AS ano, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ?
      GROUP BY ano ORDER BY ano DESC LIMIT 5
    `, [usuarioId]);

    res.render('vendas/relatorio', {
      totaisDia,
      totaisSemana,
      totaisMes,
      totaisAno
    });

  } catch (erro) {
    console.error('Erro ao carregar relatório:', erro);
    res.status(500).send('Erro ao carregar relatório.');
  }
};


const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.gerarPDF = async (req, res) => {
  const usuarioId = req.session.usuario.id;

  try {
    // Consulta os dados de vendas agrupados
    const [totaisDia] = await conectar.execute(`
      SELECT DATE(data) AS dia, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 7 DAY
      GROUP BY dia ORDER BY dia DESC
    `, [usuarioId]);

    const [totaisSemana] = await conectar.execute(`
      SELECT YEARWEEK(data, 1) AS semana, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 28 DAY
      GROUP BY semana ORDER BY semana DESC
    `, [usuarioId]);

    const [totaisMes] = await conectar.execute(`
      SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ? AND data >= CURDATE() - INTERVAL 1 YEAR
      GROUP BY mes ORDER BY mes DESC
    `, [usuarioId]);

    const [totaisAno] = await conectar.execute(`
      SELECT YEAR(data) AS ano, SUM(total) AS total
      FROM vendas
      WHERE usuario_id = ?
      GROUP BY ano ORDER BY ano DESC LIMIT 5
    `, [usuarioId]);

    // Geração do PDF
    const doc = new PDFDocument({ margin: 50 });
    const nomeArquivo = `relatorio-completo-${Date.now()}.pdf`;
    const caminho = path.join(__dirname, '../public/relatorios', nomeArquivo);
    const stream = fs.createWriteStream(caminho);
    doc.pipe(stream);

    doc.fontSize(20).text('Relatório de Vendas', { align: 'center' });
    doc.moveDown(1.5);

    const renderSecao = (titulo, dados, formatador) => {
      doc.fontSize(16).fillColor('#215a6d').text(titulo);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('black');
      dados.forEach(item => {
        doc.text(formatador(item));
      });
      doc.moveDown(1);
    };

    renderSecao('Totais por Dia (Últimos 7 dias)', totaisDia, item =>
      `Dia: ${item.dia.toISOString().slice(0,10)} - Total: R$ ${parseFloat(item.total).toFixed(2)}`
    );

    renderSecao('Totais por Semana (Últimas 4 semanas)', totaisSemana, item =>
      `Semana: ${item.semana} - Total: R$ ${parseFloat(item.total).toFixed(2)}`
    );

    renderSecao('Totais por Mês (Últimos 12 meses)', totaisMes, item =>
      `Mês: ${item.mes} - Total: R$ ${parseFloat(item.total).toFixed(2)}`
    );

    renderSecao('Totais por Ano (Últimos 5 anos)', totaisAno, item =>
      `Ano: ${item.ano} - Total: R$ ${parseFloat(item.total).toFixed(2)}`
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
    console.error('Erro ao gerar PDF completo:', err);
    res.status(500).send('Erro ao gerar o PDF.');
  }
};

