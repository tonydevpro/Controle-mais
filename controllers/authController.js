const conectar = require('../banco/conexao');
const { sendMail } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const TOKEN_EXPIRATION_MINUTES = 60; // token válido por 60 minutos

// Exibe formulário para solicitar reset (email)
exports.formEsqueciSenha = (req, res) => {
  res.render('auth/esqueciSenha', { erro: null, sucesso: null });
};

// Gera token, salva e envia link para email
exports.enviarLinkReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.render('auth/esqueciSenha', { erro: 'Informe o e-mail.', sucesso: null });

  try {
    const [usuarios] = await conectar.execute('SELECT id, email, nome FROM usuarios WHERE email = ?', [email.toLowerCase()]);
    if (usuarios.length === 0) {
      // Não revelar se email existe — show success anyway to avoid enumeration
      return res.render('auth/esqueciSenha', { erro: null, sucesso: 'Se este e-mail existir no sistema, você receberá um link para redefinir a senha.' });
    }

    const usuario = usuarios[0];

    // gerar token
    const token = uuidv4() + '-' + Math.random().toString(36).slice(2, 8);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    // opcional: deletar tokens antigos do usuário
    await conectar.execute('DELETE FROM password_resets WHERE usuario_id = ?', [usuario.id]);

    // salvar token
    await conectar.execute('INSERT INTO password_resets (usuario_id, token, expires_at) VALUES (?, ?, ?)', [usuario.id, token, expiresAt]);

    // montar link
    const appUrl = process.env.APP_URL || `http://${req.headers.host}`;
    const link = `${appUrl}/resetar-senha?token=${encodeURIComponent(token)}`;

    // enviar email
    const html = `
      <p>Olá ${usuario.nome || ''},</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha. Este link expira em ${TOKEN_EXPIRATION_MINUTES} minutos.</p>
      <p><a href="${link}">Redefinir minha senha</a></p>
      <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
    `;

    await sendMail({ to: usuario.email, subject: 'Redefinir senha - Controle+', html });

    res.render('auth/esqueciSenha', { erro: null, sucesso: 'Se esse e-mail existir, um link para redefinir a senha foi enviado.' });
  } catch (err) {
    console.error('Erro ao enviar link reset:', err);
    res.render('auth/esqueciSenha', { erro: 'Erro ao processar solicitação. Tente novamente mais tarde.', sucesso: null });
  }
};

// Mostrar formulário onde usuário informa nova senha (token na query)
exports.formResetarSenha = async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Token inválido.');

  try {
    const [rows] = await conectar.execute('SELECT * FROM password_resets WHERE token = ? AND used = 0 LIMIT 1', [token]);
    if (rows.length === 0) return res.status(400).send('Token inválido ou expirado.');

    const pr = rows[0];
    if (new Date(pr.expires_at) < new Date()) {
      return res.status(400).send('Token expirado.');
    }

    res.render('auth/resetarSenha', { token, erro: null });
  } catch (err) {
    console.error('Erro em formResetarSenha:', err);
    res.status(500).send('Erro interno.');
  }
};

// Processar mudança de senha
exports.processarResetSenha = async (req, res) => {
  const { token, senha, senha_confirm } = req.body;
  if (!token) return res.status(400).send('Token ausente.');
  if (!senha || senha.length < 4) return res.render('auth/resetarSenha', { token, erro: 'Senha muito curta (mínimo 4 caracteres).' });
  if (senha !== senha_confirm) return res.render('auth/resetarSenha', { token, erro: 'Senhas não coincidem.' });

  try {
    const [rows] = await conectar.execute('SELECT * FROM password_resets WHERE token = ? AND used = 0 LIMIT 1', [token]);
    if (rows.length === 0) return res.status(400).send('Token inválido ou já utilizado.');

    const pr = rows[0];
    if (new Date(pr.expires_at) < new Date()) {
      return res.status(400).send('Token expirado.');
    }

    // atualizar senha do usuário
    const hash = await bcrypt.hash(senha, 10);
    await conectar.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [hash, pr.usuario_id]);

    // invalidar token (marcar usado)
    await conectar.execute('UPDATE password_resets SET used = 1 WHERE id = ?', [pr.id]);

    res.render('auth/resetarSenhaSucesso');
  } catch (err) {
    console.error('Erro ao processar reset senha:', err);
    res.status(500).send('Erro interno.');
  }
};


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