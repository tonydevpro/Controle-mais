// controllers/produtosControladores.js
const Produto = require('../models/produto');
const conectar = require('../banco/conexao');


// Listar produtos da loja
exports.listar = async (req, res) => {
  console.log("➡️ Entrou no controller de produtos");

  try {
    const usuario = req.session.usuario;
    console.log("Usuário na sessão:", usuario);

    if (!usuario) {
      console.log("⛔ Nenhum usuário na sessão");
      return res.redirect('/login');
    }

    console.log("Buscando produtos da loja:", usuario.loja_id);

    const [produtos] = await conectar.execute(
      'SELECT * FROM produtos WHERE loja_id = ?',
      [usuario.loja_id]
    );

    console.log("Produtos encontrados:", produtos.length);

    res.render('produtos/listar', { produtos });
    console.log("✅ Renderizou página de produtos");
  } catch (error) {
    console.error("❌ Erro no controller de produtos:", error.message);
    res.status(500).send("Erro ao carregar produtos");
  }
};


// Formulário para adicionar novo produto
exports.formAdicionar = (req, res) => {
  res.render('produtos/adicionar', { usuarioLogado: req.session.usuario });
};

// Salvar novo produto
exports.salvar = (req, res) => {
  const usuario_id = req.session.usuario.id;
  const loja_id = req.session.usuario.loja_id;

  const produto = {
    nome: req.body.nome,
    descricao: req.body.descricao,
    preco_custo: req.body.preco_custo,
    preco_venda: req.body.preco_venda,
    quantidade: req.body.quantidade,
    imagem: req.file ? req.file.filename : null,
    usuario_id,   // quem cadastrou
    loja_id       // a loja que é dona do produto
  };

  Produto.inserir(produto, (err) => {
    if (err) {
      console.error('Erro ao cadastrar produto:', err);
      return res.status(500).send('Erro ao cadastrar produto');
    }
    res.redirect('/produtos');
  });
};

// Formulário para editar produto
exports.formEditar = (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const produtoId = req.params.id;

  Produto.buscarPorId(produtoId, loja_id, (err, produto) => {
    if (err) {
      console.error('Erro ao buscar produto para edição:', err);
      return res.status(500).send('Erro ao buscar produto');
    }

    if (!produto) {
      return res.status(404).send('Produto não encontrado ou não pertence a esta loja.');
    }

    res.render('produtos/editar', { 
      produto, 
      usuarioLogado: req.session.usuario 
    });
  });
};

// Atualizar produto
exports.atualizarProduto = (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const produtoId = req.params.id;

  const produto = {
    nome: req.body.nome,
    descricao: req.body.descricao,
    preco_custo: req.body.preco_custo,
    preco_venda: req.body.preco_venda,
    quantidade: req.body.quantidade,
    imagem: req.file ? req.file.filename : req.body.imagem_antiga
  };

  Produto.atualizar(produtoId, loja_id, produto, (err, resultado) => {
  if (err) {
    console.error('Erro ao atualizar produto:', err);
    return res.status(500).send('Erro ao atualizar produto');
  }
  if (resultado.affectedRows === 0) {
    return res.status(403).send('Produto não encontrado ou não pertence a esta loja.');
  }
  res.redirect('/produtos');
});

};

// Deletar produto
exports.deletarProduto = (req, res) => {
  const loja_id = req.session.usuario.loja_id;
  const produtoId = req.params.id;

  Produto.excluir(produtoId, loja_id, (err, resultado) => {
    if (err) {
      console.error('Erro ao excluir produto:', err);
      return res.status(500).send('Erro ao excluir produto');
    }
    if (resultado.affectedRows === 0) {
      return res.status(403).send('Produto não encontrado ou não pertence a esta loja.');
    }
    res.redirect('/produtos');
  });
};

// Importar produtos via CSV
exports.importarProdutos = (req, res) => {
  const loja_id = req.session.usuario.loja_id;

  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  console.log('Arquivo CSV recebido:', req.file.filename);
  // TODO: Implementar leitura do CSV e salvar produtos vinculando a loja_id

  res.redirect('/produtos');
};
