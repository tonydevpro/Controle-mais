const conectar = require('../banco/conexao');
const bcrypt = require('bcryptjs');

// Formulário de login
exports.formLogin = (req, res) => {
  res.render('auth/login', { erro: null });
};

// Processar login
exports.logar = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [usuarios] = await conectar.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email.toLowerCase()]
    );

    if (usuarios.length === 0) {
      return res.render('auth/login', { erro: 'Usuário não encontrado' });
    }

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.render('auth/login', { erro: 'Senha incorreta' });
    }

    // Buscar todas as permissões do cargo
    const [linhasPermissoes] = await conectar.execute(`
      SELECT p.chave 
      FROM permissoes p
      JOIN cargo_permissoes cp ON cp.permissao_id = p.id
      WHERE cp.cargo_id = ?
    `, [usuario.cargo_id]);

    const permissoes = linhasPermissoes.map(p => p.chave);

    // Salvar dados principais + permissões na sessão
    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo_id: usuario.cargo_id,
      loja_id: usuario.loja_id,
      eh_dono: usuario.eh_dono,
      permissoes
    };

    // Mapa de rotas com permissão necessária
    const rotasSistema = [
      { href: '/dashboard', chave: 'dashboard_principal' },
      { href: '/produtos', chave: 'produtos_listar' },
      { href: '/movimentacoes', chave: 'movimentacoes_listar' },
      { href: '/vendas', chave: 'vendas_listar' },
      { href: '/usuario/gerenciar', chave: 'usuarios_ver' },
      { href: '/admin/cargos', chave: 'admin' },
      { href: '/pdv', chave: 'pdv_acessar' }
    ];

    // Encontrar a primeira rota acessível pelo usuário
    const destino = rotasSistema.find(r => permissoes.includes(r.chave))?.href;

    // Redirecionar para rota acessível ou para home como fallback
    return res.redirect(destino || '/');

  } catch (erro) {
    console.error('Erro ao logar:', erro);
    res.status(500).render('auth/login', { erro: 'Erro ao processar login. Tente novamente.' });
  }
};



// Formulário para registro da primeira loja
exports.formRegistroLoja = async (req, res) => {
  try {
    const [lojas] = await conectar.execute('SELECT id FROM lojas LIMIT 1');

    if (lojas.length > 0) {
      // Se o sistema deve permitir apenas uma loja, redirecionar
      // return res.redirect('/login');
    }

    res.render('auth/registrar', { erro: null });
  } catch (erro) {
    console.error('Erro ao carregar registro de loja:', erro);
    res.status(500).send('Erro ao carregar página de registro');
  }
};

// Cadastro da loja + dono
exports.registrarLoja = async (req, res) => {
  const { nome_loja, nome_admin, email, senha } = req.body;

  try {
    // Criar loja
    const [resultadoLoja] = await conectar.execute(
      'INSERT INTO lojas (nome_fantasia) VALUES (?)',
      [nome_loja]
    );

    const loja_id = resultadoLoja.insertId;

    // Criar dono (primeiro usuário da loja)
    const hashSenha = await bcrypt.hash(senha, 10);
    const cargoId = 1; // Dono/admin padrão
    const ehDono = 1;

    await conectar.execute(
      'INSERT INTO usuarios (nome, email, senha, cargo_id, loja_id, eh_dono) VALUES (?, ?, ?, ?, ?, ?)',
      [nome_admin, email.toLowerCase(), hashSenha, cargoId, loja_id, ehDono]
    );

    req.flash('sucesso', 'Conta criada com sucesso!');
    return res.redirect('/login');
  } catch (err) {
    console.error('Erro ao registrar loja:', err);
    res.render('auth/registrar', { erro: 'Erro ao registrar. Verifique os dados e tente novamente.' });
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};