document.addEventListener('DOMContentLoaded', async () => {
  const resultadoRaw = sessionStorage.getItem('resultado_investigacao');

  if (!resultadoRaw) {
    window.location.href = '/campanha';
    return;
  }

  const dados = JSON.parse(resultadoRaw);

  const subtituloCasoEl = document.getElementById('subtitulo-caso-conclusao');
  const tituloVeredito = document.getElementById('titulo-veredito');
  const badgeStatus = document.getElementById('badge-status-resultado');

  const numPokedex = document.getElementById('pokedex-num');
  const nomePokemon = document.getElementById('pokemon-nome');
  const tiposContainer = document.getElementById('pokemon-tipos');
  const categoriaPokemon = document.getElementById('pokemon-categoria');
  const spriteImg = document.getElementById('pokemon-sprite');
  const spriteLoading = document.getElementById('pokemon-loading');

  const mensagemJustificativa = document.getElementById('mensagem-justificativa');
  const scoreHoras = document.getElementById('score-horas');
  const scoreBase = document.getElementById('score-base');
  const scoreBonus = document.getElementById('score-bonus');
  const scoreTotal = document.getElementById('score-total');
  const scoreRank = document.getElementById('score-rank');

  const btnAcao = document.getElementById('btn-acao-principal');
  const btnVoltarMesa = document.getElementById('btn-voltar-mesa');

  const eVitoria = dados.resultado === 'VITORIA' || dados.correto === true;

  if (subtituloCasoEl && (dados.numero_caso || dados.titulo_caso)) {
    subtituloCasoEl.textContent = [dados.numero_caso, dados.titulo_caso].filter(Boolean).join(' • ');
  }

  if (dados.tipoCaso === 'diario') {
    btnVoltarMesa.href = '/diario';
    btnAcao.style.display = 'none';
  } else {
    btnVoltarMesa.href = '/campanha';
    if (eVitoria) {
      const proximoId = dados.proximo_caso_id || dados.proximoCasoId;
      btnAcao.textContent = proximoId ? 'Próximo Caso' : 'Ver Mesa de Casos';
      btnAcao.href = proximoId ? `/investigacao?id=${proximoId}` : '/campanha';
    } else {
      btnAcao.textContent = 'Tentar Novamente';
      btnAcao.href = dados.casoId ? `/investigacao?id=${dados.casoId}` : '/campanha';
    }
  }

  const pokemonExibido = eVitoria
    ? (dados.pokemon || dados.palpite || '')
    : (dados.palpite || dados.pokemon || '');

  nomePokemon.textContent = pokemonExibido || 'Desconhecido';
  tiposContainer.innerHTML = '';
  categoriaPokemon.textContent = 'Categoria: Carregando...';

  if (pokemonExibido) {
    let nomeLimpo = pokemonExibido
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’.:]/g, '')
      .replace(/\s+/g, '-');

    if (nomeLimpo === 'nidoran') {
      nomeLimpo = 'nidoran-m';
    }

    try {
      let respostaAPI = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeLimpo}`);

      if (!respostaAPI.ok && nomeLimpo.includes('-')) {
        const nomeSemHifen = nomeLimpo.replace(/-/g, '');
        respostaAPI = await fetch(`https://pokeapi.co/api/v2/pokemon/${nomeSemHifen}`);
      }

      if (respostaAPI.ok) {
        const pokeData = await respostaAPI.json();

        numPokedex.textContent = `#${String(pokeData.id).padStart(3, '0')}`;

        const imagemUrl = pokeData.sprites.other['official-artwork'].front_default || pokeData.sprites.front_default;
        if (imagemUrl) {
          spriteImg.src = imagemUrl;
          spriteImg.classList.remove('escondido');
          if (spriteLoading) spriteLoading.style.display = 'none';
        }

        pokeData.types.forEach(t => {
          const span = document.createElement('span');
          span.className = 'badge-tipo';
          span.textContent = t.type.name.toUpperCase();
          tiposContainer.appendChild(span);
        });

        try {
          const resEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokeData.id}`);
          if (resEspecie.ok) {
            const espData = await resEspecie.json();
            const genus = espData.genera.find(g => g.language.name === 'en');
            if (genus) {
              categoriaPokemon.textContent = `Categoria: ${genus.genus}`;
            }
          }
        } catch (e) {
          categoriaPokemon.textContent = 'Categoria: Unknown';
        }
      } else {
        throw new Error('Pokémon não encontrado na PokéAPI');
      }
    } catch (error) {
      console.warn('Erro PokéAPI:', error);
      if (spriteLoading) spriteLoading.textContent = 'Foto indisponível';
      categoriaPokemon.textContent = 'Categoria: Indisponível';
    }
  }

  const horasRest = Number(dados.horas_restantes ?? dados.horasRestantes ?? 0);
  const horasInit = Number(dados.horas_iniciais ?? dados.horasIniciais ?? 60);
  const basePts = Number(dados.pontuacao_base ?? (eVitoria ? 400 : 0));
  const bonusPts = Number(dados.bonus_tempo ?? (eVitoria ? Math.round((horasRest / Math.max(1, horasInit)) * 400) : 0));
  const totalPts = Number(dados.pontuacao_final ?? (basePts + bonusPts));
  const rankObtido = dados.rank_conclusao || (eVitoria ? 'A' : 'F');

  if (scoreHoras) scoreHoras.textContent = `${horasRest}h / ${horasInit}h`;
  if (scoreBase) scoreBase.textContent = `${basePts} pts`;
  if (scoreBonus) scoreBonus.textContent = `+${bonusPts} pts`;
  if (scoreTotal) scoreTotal.textContent = `${totalPts} pts`;
  if (scoreRank) scoreRank.textContent = `RANK ${rankObtido}`;

  if (eVitoria) {
    tituloVeredito.textContent = 'CASO SOLUCIONADO!';
    badgeStatus.textContent = 'Suspeito Capturado e Custodiado';
    badgeStatus.className = 'badge-status status-vitoria';

    mensagemJustificativa.textContent = dados.mensagem || 'O mandado de prisão foi cumprido com sucesso com base nas evidências apresentadas.';
  } else {
    tituloVeredito.textContent = 'CRIME NÃO SOLUCIONADO';
    badgeStatus.textContent = 'Caso Arquivado / Mandado Rejeitado';
    badgeStatus.className = 'badge-status status-derrota';

    const culpadoRealMsg = dados.pokemon
      ? ` O suspeito real era ${String(dados.pokemon).toUpperCase()}.`
      : '';
    mensagemJustificativa.textContent = (dados.mensagem || 'O suspeito informado não corresponde às evidências levantadas.') + culpadoRealMsg;
  }
});