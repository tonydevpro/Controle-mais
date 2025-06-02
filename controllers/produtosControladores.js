const conectar = require('../banco/conexao');
const fs = require('fs');
const csv = require('csv-parser');



exports.listar = async (req, res) => {
  try {
    
    const [produtos] = await conectar.execute('SELECT * FROM produtos WHERE usuario_id = ?',
  [req.session.usuario.id]);
    
    res.render('produtos/listar', { produtos });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao buscar produtos');
  }
};

exports.formAdicionar = (req, res) => {
  res.render('produtos/formAdicionar');
};

exports.salvar = async (req, res) => {
  try {
    const nome = req.body.nome;
    const descricao = req.body.descricao;
    const preco_custo = req.body.preco_custo ? parseFloat(req.body.preco_custo) : 0;
    const preco_venda = parseFloat(req.body.preco_venda);
    const quantidade = req.body.quantidade ? parseInt(req.body.quantidade) : 0;
    
    await conectar.execute(
      'INSERT INTO produtos (nome, descricao, preco_custo, preco_venda, quantidade, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, descricao, preco_custo || 0, preco_venda, quantidade || 0, req.session.usuario.id]
    );
    
    res.redirect('/produtos');
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao salvar produto');
  }
};

exports.formEditar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [resultado] = await conectar.execute('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?',
  [id, req.session.usuario.id]);
    
    if (resultado.length === 0) {
      return res.status(404).send('Produto não encontrado');
    }
    res.render('produtos/formEditar', { produto: resultado[0] });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao carregar formulário de edição');
  }
};

exports.atualizarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, preco_custo, preco_venda, quantidade } = req.body;
    
    await conectar.execute(
      'UPDATE produtos SET nome=?, descricao=?, preco_custo=?, preco_venda=?, quantidade=? WHERE id=? AND usuario_id=?',
      [nome, descricao, preco_custo || 0, preco_venda, quantidade || 0, id, req.session.usuario.id]
    );
    
    res.redirect('/produtos');
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao atualizar produto');
  }
};

exports.deletarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    
    await conectar.execute('DELETE FROM produtos WHERE id = ? AND usuario_id = ?', [id, req.session.usuario.id]);
    
    res.redirect('/produtos');
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro ao deletar produto');
  }
};

exports.importarProdutos = async (req, res) => {
  const usuarioId = req.session.usuario.id;
  const caminho = req.file.path;
  const produtos = [];

  fs.createReadStream(caminho)
    .pipe(csv()) // espera colunas: nome, quantidade, preco_custo, preco_venda
    .on('data', (linha) => {
      produtos.push([
        linha.nome,
        parseInt(linha.quantidade),
        parseFloat(linha.preco_custo),
        parseFloat(linha.preco_venda),
        usuarioId
      ]);
    })
    .on('end', async () => {
      try {
        await conectar.query(`
          INSERT INTO produtos (nome, quantidade, preco_custo, preco_venda, usuario_id)
          VALUES ?
        `, [produtos]);

        fs.unlinkSync(caminho); // remove o arquivo temporário
        req.flash('sucesso', 'Produtos importados com sucesso!');
        res.locals.mensagens = req.flash('sucesso');
        res.redirect('/produtos'); // ou para onde quiser
      } catch (erro) {
        console.error('Erro ao importar produtos:', erro);
        res.status(500).send('Erro ao importar produtos.');
      }
    });
};

