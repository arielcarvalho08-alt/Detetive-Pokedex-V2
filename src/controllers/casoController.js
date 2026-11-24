const Caso = require('../models/Caso.js');
const Progresso = require('../models/Progresso.js');

const PONTUACAO_BASE_POR_RANK = {
  D: 400,
  C: 600,
  B: 800,
  A: 1000,
  S: 1300
};

function calcularPontuacaoERank(caso, eCorreto, horasRestantesRaw, horasIniciaisRaw) {
  if (!eCorreto) {
    return {
      pontuacaoBase: 0,
      bonusTempo: 0,
      pontuacaoFinal: 0,
      rankConclusao: 'F'
    };
  }

  const rankCaso = (caso.rank || 'D').toUpperCase();
  const pontuacaoBase = PONTUACAO_BASE_POR_RANK[rankCaso] || 400;

  const horasIniciais = Math.max(1, Number(horasIniciaisRaw) || Number(caso.horas_iniciais) || 60);
  const horasRestantes = Math.max(0, Math.min(horasIniciais, Number(horasRestantesRaw) ?? horasIniciais));

  const proporcaoTempo = horasRestantes / horasIniciais;
  let bonusTempo = Math.round(proporcaoTempo * 400);

  if (horasRestantes <= 0) {
    bonusTempo = Math.round(bonusTempo * 0.5);
  }

  const pontuacaoFinal = pontuacaoBase + bonusTempo;
  const pontuacaoMaximaPossivel = pontuacaoBase + 400;
  const aproveitamento = pontuacaoFinal / pontuacaoMaximaPossivel;

  let rankConclusao = 'D';
  if (aproveitamento >= 0.80) rankConclusao = 'S';
  else if (aproveitamento >= 0.65) rankConclusao = 'A';
  else if (aproveitamento >= 0.45) rankConclusao = 'B';
  else if (aproveitamento >= 0.25) rankConclusao = 'C';

  return {
    pontuacaoBase,
    bonusTempo,
    pontuacaoFinal,
    rankConclusao
  };
}

async function registrarProgressoConclusao(caso, eCorreto, pontuacaoFinal, rankConclusao, horasRestantes, horasIniciais, modoDiario = false) {
  try {
    let progresso = await Progresso.findOne({ session_id: 'detetive_local' });
    if (!progresso) {
      progresso = new Progresso({ session_id: 'detetive_local' });
    }

    const casoIdStr = String(caso._id);

    if (eCorreto) {
      const jaResolvido = (progresso.casos_resolvidos || []).some(id => String(id) === casoIdStr);
      if (!jaResolvido) {
        progresso.casos_resolvidos.push(caso._id);
        progresso.pontuacao_total = (progresso.pontuacao_total || 0) + pontuacaoFinal;
      } else {
        progresso.pontuacao_total = (progresso.pontuacao_total || 0) + Math.round(pontuacaoFinal * 0.25);
      }

      progresso.casos_arquivados = (progresso.casos_arquivados || []).filter(id => String(id) !== casoIdStr);

      if (modoDiario) {
        progresso.daily_concluido_hoje = true;
        progresso.data_ultimo_daily = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
      }
    } else {
      const jaArquivado = (progresso.casos_arquivados || []).some(id => String(id) === casoIdStr);
      if (!jaArquivado) {
        progresso.casos_arquivados.push(caso._id);
      }
    }

    progresso.historico_casos = progresso.historico_casos || [];
    progresso.historico_casos.push({
      caso_id: caso._id,
      numero_caso: caso.numero_caso,
      titulo: caso.titulo,
      rank_caso: caso.rank,
      rank_obtido: rankConclusao,
      pontuacao: pontuacaoFinal,
      horas_restantes: horasRestantes,
      horas_iniciais: horasIniciais,
      acertou: eCorreto,
      data_conclusao: new Date()
    });

    await progresso.save();
  } catch (err) {
    console.error('Aviso ao salvar progresso:', err.message);
  }
}

async function buscarProximoCaso(casoAtual) {
  try {
    const todosCasos = await Caso.find({}).sort({ numero_caso: 1 }).select('_id numero_caso titulo').lean();
    if (!todosCasos || todosCasos.length === 0) return null;

    const indiceAtual = todosCasos.findIndex(c => String(c._id) === String(casoAtual._id));
    if (indiceAtual >= 0 && indiceAtual + 1 < todosCasos.length) {
      return todosCasos[indiceAtual + 1];
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar próximo caso:', err.message);
    return null;
  }
}

exports.getDailyCaso = async (req, res) => {
  try {
    const caso = await resolverCasoDoDia();
    if (!caso) return res.status(404).json({ mensagem: 'Nenhum caso disponível para o diário.' });

    const casoParaFront = caso.toObject();
    delete casoParaFront.pokemon_correto;
    casoParaFront.modo_diario = true;
    res.json(casoParaFront);
  } catch (error) {
    console.error('Erro em getDailyCaso:', error);
    res.status(500).json({ mensagem: 'Erro ao procurar o caso diário.', erro: error.message });
  }
};

exports.getCasosPorRank = async (req, res) => {
  try {
    const { rank } = req.params;
    const casos = await Caso.find({ rank: rank.toUpperCase() }).select('-pokemon_correto');
    res.json(casos);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao listar os casos do rank.', erro: error.message });
  }
};

exports.getCasoPorId = async (req, res) => {
  try {
    const caso = await Caso.findById(req.params.id);
    if (!caso) return res.status(404).json({ mensagem: 'Caso não encontrado.' });

    const casoParaFront = caso.toObject();
    delete casoParaFront.pokemon_correto;
    res.json(casoParaFront);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao procurar o caso.', erro: error.message });
  }
};

async function resolverCasoDoDia(dataRef = new Date()) {
  const todosCasos = await Caso.find({}).sort({ _id: 1 });
  if (!todosCasos || todosCasos.length === 0) return null;

  const dataStr = dataRef.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    hash = (hash * 31 + dataStr.charCodeAt(i)) >>> 0;
  }

  const indice = hash % todosCasos.length;
  return todosCasos[indice];
}

function compararNomesPokemon(palpite, correto) {
  if (!palpite || !correto) return false;

  const normalizar = (str) =>
    str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  return normalizar(palpite) === normalizar(correto);
}

async function processarValidacaoMandado(caso, req, res, modoDiario = false) {
  const { palpite, horasRestantes, horasIniciais } = req.body;

  if (!palpite) {
    return res.status(400).json({ mensagem: 'O nome do Pokémon é obrigatório.' });
  }

  const eCorreto = compararNomesPokemon(palpite, caso.pokemon_correto);
  const horasInitFinal = Number(horasIniciais) || Number(caso.horas_iniciais) || 60;
  const horasRestFinal = Math.max(0, Number(horasRestantes) ?? horasInitFinal);

  const score = calcularPontuacaoERank(caso, eCorreto, horasRestFinal, horasInitFinal);

  await registrarProgressoConclusao(
    caso,
    eCorreto,
    score.pontuacaoFinal,
    score.rankConclusao,
    horasRestFinal,
    horasInitFinal,
    modoDiario
  );

  const proximoCaso = eCorreto && !modoDiario ? await buscarProximoCaso(caso) : null;

  if (eCorreto) {
    return res.json({
      resultado: 'VITORIA',
      correto: true,
      mensagem: 'Mandado cumprido com sucesso! Suspeito capturado com base nas evidências levantadas.',
      pokemon: caso.pokemon_correto,
      dados_pokedex: caso.dados_pokemon_vitoria,
      numero_caso: caso.numero_caso,
      titulo_caso: caso.titulo,
      rank_caso: caso.rank,
      proximo_caso_id: proximoCaso ? String(proximoCaso._id) : null,
      proximo_caso_numero: proximoCaso ? proximoCaso.numero_caso : null,
      horas_iniciais: horasInitFinal,
      horas_restantes: horasRestFinal,
      pontuacao_base: score.pontuacaoBase,
      bonus_tempo: score.bonusTempo,
      pontuacao_final: score.pontuacaoFinal,
      rank_conclusao: score.rankConclusao
    });
  }

  return res.json({
    resultado: 'DERROTA_OU_FALHA',
    correto: false,
    mensagem: 'Mandado inválido! O suspeito informado não corresponde às evidências do caso.',
    pokemon: caso.pokemon_correto,
    numero_caso: caso.numero_caso,
    titulo_caso: caso.titulo,
    rank_caso: caso.rank,
    proximo_caso_id: null,
    proximo_caso_numero: null,
    horas_iniciais: horasInitFinal,
    horas_restantes: horasRestFinal,
    pontuacao_base: score.pontuacaoBase,
    bonus_tempo: score.bonusTempo,
    pontuacao_final: score.pontuacaoFinal,
    rank_conclusao: score.rankConclusao
  });
}

exports.validarMandado = async (req, res) => {
  try {
    const { id } = req.params;
    const caso = await Caso.findById(id);
    if (!caso) return res.status(404).json({ mensagem: 'Caso não encontrado.' });

    return processarValidacaoMandado(caso, req, res, false);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao validar mandado.', erro: error.message });
  }
};

exports.validarMandadoDiario = async (req, res) => {
  try {
    const caso = await resolverCasoDoDia();
    if (!caso) return res.status(404).json({ mensagem: 'Caso diário não encontrado.' });

    return processarValidacaoMandado(caso, req, res, true);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao validar mandado.', erro: error.message });
  }
};