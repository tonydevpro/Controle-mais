// controllers/produtosControladores.js
const Produto = require('../models/produto');
const conectar = require('../banco/conexao');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// ================== LISTAR ==================
exports.listar = async (req, res) => {
  try {
    const usuario = req.session.usuario;
    if (!usuario) return res.redirect('/login');

    const [produtos] = await conectar.execute(
      'SELECT * FROM produtos WHERE loja_id = ? AND ativo = 1',
      [usuario.loja_id]
    );

    res.render('produtos/listar', { produtos });
  } catch (err) {
    console.error('❌ Erro ao listar produtos:', err);
    res.status(500).send('Erro ao listar produtos');
  }
};

// ================== FORM ADICIONAR ==================
exports.formAdicionar = (req, res) => {
  res.render('produtos/formAdicionar', { usuarioLogado: req.session.usuario });
};

// ================== SALVAR ==================
exports.salvar = async (req, res) => {
  try {
    const { id: usuario_id, loja_id } = req.session.usuario;

    const produto = {
      nome: req.body.nome,
      descricao: req.body.descricao,
      preco_custo: req.body.preco_custo,
      preco_venda: req.body.preco_venda,
      quantidade: req.body.quantidade,
      imagem: req.file ? req.file.filename : null,
      usuario_id,
      loja_id,
      estoque_minimo: req.body.estoque_minimo || 0,
      ativo: 1
    };

    await Produto.inserir(produto);
    res.redirect('/produtos');
  } catch (err) {
    console.error('❌ Erro ao cadastrar produto:', err);
    res.status(500).send('Erro ao cadastrar produto');
  }
};

// ================== FORM EDITAR ==================
exports.formEditar = async (req, res) => {
  try {
    const loja_id = req.session.usuario.loja_id;
    const produtoId = req.params.id;

    const produto = await Produto.buscarPorId(produtoId, loja_id);

    if (!produto) {
      return res.status(404).send('Produto não encontrado ou não pertence a esta loja.');
    }

    res.render('produtos/formEditar', { 
      produto, 
      usuarioLogado: req.session.usuario 
    });
  } catch (err) {
    console.error('❌ Erro no formEditar:', err);
    res.status(500).send('Erro ao buscar produto para edição');
  }
};

// ================== ATUALIZAR ==================
exports.atualizarProduto = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const produtoId = req.params.id;

  const produto = {
    nome: req.body.nome ?? null,
    descricao: req.body.descricao ?? '',
    preco_custo: Number(req.body.preco_custo) || 0,
    preco_venda: Number(req.body.preco_venda) || 0,
    quantidade: Number(req.body.quantidade) || 0,
    estoque_minimo: Number(req.body.estoque_minimo) || 0
  };

  try {
    const resultado = await Produto.atualizar(produtoId, loja_id, produto);
    if (resultado.affectedRows === 0) {
      return res.status(403).send('Produto não encontrado ou não pertence a esta loja.');
    }
    res.redirect('/produtos');
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).send('Erro ao atualizar produto');
  }
};



// ================== INATIVAR (DELETAR) ==================
exports.deletarProduto = async (req, res) => {
  try {
    const usuario = req.session.usuario;
    const produtoId = req.params.id;

    const [resultado] = await conectar.execute(
      'UPDATE produtos SET ativo = 0 WHERE id = ? AND loja_id = ?',
      [produtoId, usuario.loja_id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).send('Produto não encontrado');
    }

    res.redirect('/produtos');
  } catch (err) {
    console.error('❌ Erro ao inativar produto:', err);
    res.status(500).send('Erro ao inativar produto');
  }
};

// ================== IMPORTAR CSV ==================
exports.importarProdutos = async (req, res) => {
  const loja_id = req.session.usuario.loja_id;

  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  const arquivoCSV = path.join(__dirname, '../uploads', req.file.filename);
  const produtosParaInserir = [];

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivoCSV)
        .pipe(csv())
        .on('data', (linha) => {
          produtosParaInserir.push({
            nome: linha.nome || 'Sem nome',
            descricao: linha.descricao || '',
            preco_custo: parseFloat(linha.preco_custo) || 0,
            preco_venda: parseFloat(linha.preco_venda) || 0,
            quantidade: parseInt(linha.quantidade) || 0,
            usuario_id: req.session.usuario.id,
            loja_id,
            estoque_minimo: parseInt(linha.estoque_minimo) || 0,
            ativo: 1
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (produtosParaInserir.length === 0) {
      return res.status(400).send('Nenhum produto válido encontrado no CSV.');
    }

    for (const produto of produtosParaInserir) {
      await conectar.execute(
        `INSERT INTO produtos 
          (nome, descricao, preco_custo, preco_venda, quantidade, usuario_id, loja_id, estoque_minimo, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          produto.nome,
          produto.descricao,
          produto.preco_custo,
          produto.preco_venda,
          produto.quantidade,
          produto.usuario_id,
          produto.loja_id,
          produto.estoque_minimo,
          produto.ativo
        ]
      );
    }

    console.log(`✅ Importados ${produtosParaInserir.length} produtos para a loja ${loja_id}`);
    res.redirect('/produtos');
  } catch (err) {
    console.error('❌ Erro ao importar produtos:', err);
    res.status(500).send('Erro ao importar produtos.');
  }
};
