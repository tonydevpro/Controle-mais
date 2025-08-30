const conectar = require('../banco/conexao');

// Listar todos os cargos (globais)
exports.listarCargos = async (req, res) => {
  try {
    const [cargos] = await conectar.execute(`
      SELECT c.id, c.nome, GROUP_CONCAT(p.chave) AS permissoes
      FROM cargos c
      LEFT JOIN cargo_permissoes cp ON cp.cargo_id = c.id
      LEFT JOIN permissoes p ON p.id = cp.permissao_id
      GROUP BY c.id, c.nome
      ORDER BY c.nome
    `);

    res.render('admin/cargos/listar', { cargos });
  } catch (erro) {
    console.error('Erro ao listar cargos:', erro);
    res.status(500).send('Erro interno');
  }
};

// Formulário para editar cargo
exports.formEditarCargo = async (req, res) => {
  const cargoId = req.params.id;

  try {
    const [[cargo]] = await conectar.execute(
      'SELECT * FROM cargos WHERE id = ?',
      [cargoId]
    );
    if (!cargo) return res.status(404).send('Cargo não encontrado');

    const [todasPermissoes] = await conectar.execute('SELECT * FROM permissoes ORDER BY chave');

    const [permissoesCargo] = await conectar.execute(`
      SELECT p.chave FROM permissoes p
      JOIN cargo_permissoes cp ON cp.permissao_id = p.id
      WHERE cp.cargo_id = ?
    `, [cargoId]);

    const chavesCargo = permissoesCargo.map(p => p.chave);

    res.render('admin/cargos/editar', { cargo, todasPermissoes, chavesCargo });
  } catch (erro) {
    console.error('Erro ao carregar formulário de edição do cargo:', erro);
    res.status(500).send('Erro interno');
  }
};

// Atualizar permissões de um cargo
exports.atualizarCargo = async (req, res) => {
  const cargoId = req.params.id;
  const permissoesSelecionadas = req.body.permissoes || [];

  try {
    // Garante que o cargo existe
    const [[cargo]] = await conectar.execute(
      'SELECT * FROM cargos WHERE id = ?',
      [cargoId]
    );
    if (!cargo) return res.status(404).send('Cargo não encontrado');

    await conectar.execute('DELETE FROM cargo_permissoes WHERE cargo_id = ?', [cargoId]);

    if (permissoesSelecionadas.length > 0) {
      const [permissoes] = await conectar.query(
        `SELECT id FROM permissoes WHERE chave IN (${permissoesSelecionadas.map(() => '?').join(',')})`,
        permissoesSelecionadas
      );
      const valores = permissoes.map(p => [cargoId, p.id]);
      await conectar.query('INSERT INTO cargo_permissoes (cargo_id, permissao_id) VALUES ?', [valores]);
    }

    res.redirect('/admin/cargos');
  } catch (erro) {
    console.error('Erro ao atualizar permissões do cargo:', erro);
    res.status(500).send('Erro interno');
  }
};

// Formulário para criar novo cargo
exports.exibirFormularioNovoCargo = async (req, res) => {
  try {
    const [permissoes] = await conectar.execute('SELECT * FROM permissoes ORDER BY nome');
    res.render('admin/cargos/novo', { permissoes });
  } catch (err) {
    console.error('Erro ao carregar permissões:', err);
    res.status(500).send('Erro ao carregar formulário de novo cargo.');
  }
};

// Criar novo cargo
exports.criarCargo = async (req, res) => {
  const { nome, permissoes } = req.body;

  try {
    const [cargoExistente] = await conectar.execute(
      'SELECT id FROM cargos WHERE nome = ?',
      [nome]
    );
    if (cargoExistente.length > 0) return res.status(400).send('Cargo já existente');

    const [resultado] = await conectar.execute(
      'INSERT INTO cargos (nome) VALUES (?)',
      [nome]
    );
    const cargoId = resultado.insertId;

    const permissoesArray = Array.isArray(permissoes) ? permissoes : permissoes ? [permissoes] : [];
    if (permissoesArray.length > 0) {
      const valores = permissoesArray.map(idPermissao => [cargoId, Number(idPermissao)]);
      await conectar.query('INSERT INTO cargo_permissoes (cargo_id, permissao_id) VALUES ?', [valores]);
    }

    res.redirect('/admin/cargos');
  } catch (err) {
    console.error('Erro ao criar cargo:', err);
    res.status(500).send('Erro ao criar cargo.');
  }
};
