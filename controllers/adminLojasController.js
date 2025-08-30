const conectar = require('../banco/conexao');
const bcrypt = require('bcrypt');

// 🔹 Formulário de nova loja
exports.formNovaLoja = (req, res) => {
  if (!req.session.usuario || !req.session.usuario.eh_dono) {
    return res.status(403).render('erroPermissao', {
      mensagem: 'Acesso restrito: apenas administradores podem criar lojas.'
    });
  }
  res.render('admin/lojas/novo');
};

// 🔹 Criar loja e dono
exports.criarLoja = async (req, res) => {
  if (!req.session.usuario || !req.session.usuario.eh_dono) {
    return res.status(403).render('erroPermissao', {
      mensagem: 'Acesso restrito: apenas administradores podem criar lojas.'
    });
  }

  const {
    nome_fantasia,
    cnpj,
    email,
    telefone,
    endereco,
    nome_dono,
    email_dono,
    senha_dono
  } = req.body;

  try {
    // 1️⃣ Verifica se CNPJ já existe
    const [lojaExistente] = await conectar.execute(
      'SELECT id FROM lojas WHERE cnpj = ?',
      [cnpj]
    );
    if (lojaExistente.length > 0) {
      return res.status(400).send('CNPJ já cadastrado');
    }

    // 2️⃣ Cria loja
    const [resultadoLoja] = await conectar.execute(
      'INSERT INTO lojas (nome_fantasia, cnpj, email_contato, telefone, endereco) VALUES (?, ?, ?, ?, ?)',
      [nome_fantasia, cnpj, email, telefone, endereco]
    );
    const loja_id = resultadoLoja.insertId;

    // 3️⃣ Verifica se email do dono já existe
    const [usuarioExistente] = await conectar.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email_dono]
    );
    if (usuarioExistente.length > 0) {
      return res.status(400).send('Email do dono já cadastrado');
    }

    // 4️⃣ Cria dono da loja
    const senhaCriptografada = await bcrypt.hash(senha_dono, 10);
    await conectar.execute(
      'INSERT INTO usuarios (nome, email, senha, loja_id, eh_dono) VALUES (?, ?, ?, ?, ?)',
      [nome_dono, email_dono, senhaCriptografada, loja_id, 1]
    );

    res.redirect('/admin/lojas');
  } catch (erro) {
    console.error('Erro ao criar loja e dono:', erro);
    res.status(500).send('Erro interno ao criar loja');
  }
};

// 🔹 Listar lojas (somente donos/admins)
exports.listarLojas = async (req, res) => {
  try {
    let query = 'SELECT * FROM lojas';
    const params = [];

    // Limita a loja do usuário se não for dono/superadmin
    if (!req.session.usuario.eh_dono) {
      query += ' WHERE id = ?';
      params.push(req.session.usuario.loja_id);
    }

    const [lojas] = await conectar.execute(query, params);
    res.render('admin/lojas/listar', { lojas });
  } catch (erro) {
    console.error('Erro ao listar lojas:', erro);
    res.status(500).send('Erro interno');
  }
};

// 🔹 Formulário para editar loja
exports.formEditarLoja = async (req, res) => {
  const lojaId = req.params.id;

  try {
    const [lojaArray] = await conectar.execute(
      'SELECT * FROM lojas WHERE id = ?',
      [lojaId]
    );
    const loja = lojaArray[0];
    if (!loja) return res.status(404).send('Loja não encontrada');

    // Apenas dono da loja pode editar
    if (!req.session.usuario.eh_dono && req.session.usuario.loja_id !== loja.id) {
      return res.status(403).render('erroPermissao', {
        mensagem: 'Você não tem permissão para editar esta loja.'
      });
    }

    res.render('admin/lojas/editar', { loja });
  } catch (erro) {
    console.error('Erro ao carregar formulário de edição da loja:', erro);
    res.status(500).send('Erro interno');
  }
};

// 🔹 Atualizar loja
exports.atualizarLoja = async (req, res) => {
  const lojaId = req.params.id;
  const { nome_fantasia, cnpj, email_contato, telefone, endereco } = req.body;

  try {
    if (!req.session.usuario.eh_dono && req.session.usuario.loja_id !== Number(lojaId)) {
      return res.status(403).render('erroPermissao', {
        mensagem: 'Você não tem permissão para atualizar esta loja.'
      });
    }

    await conectar.execute(
      'UPDATE lojas SET nome_fantasia = ?, cnpj = ?, email_contato = ?, telefone = ?, endereco = ? WHERE id = ?',
      [nome_fantasia, cnpj, email_contato, telefone, endereco, lojaId]
    );

    res.redirect('/admin/lojas');
  } catch (erro) {
    console.error('Erro ao atualizar loja:', erro);
    res.status(500).send('Erro interno');
  }
};

// 🔹 Excluir loja
exports.excluirLoja = async (req, res) => {
  const lojaId = req.params.id;

  try {
    if (!req.session.usuario.eh_dono && req.session.usuario.loja_id !== Number(lojaId)) {
      return res.status(403).render('erroPermissao', {
        mensagem: 'Você não tem permissão para excluir esta loja.'
      });
    }

    await conectar.execute('DELETE FROM lojas WHERE id = ?', [lojaId]);
    res.redirect('/admin/lojas');
  } catch (erro) {
    console.error('Erro ao excluir loja:', erro);
    res.status(500).send('Erro interno');
  }
};
