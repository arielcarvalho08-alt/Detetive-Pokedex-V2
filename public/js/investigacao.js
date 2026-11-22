let listaPokemonsCache = [];
const ehDiario = new URLSearchParams(window.location.search).get('tipo') === 'diario';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const casoId = urlParams.get('id');
  const tipoCaso = urlParams.get('tipo');

  const btnVoltar = document.querySelector('.btn-voltar-caso');
  if (btnVoltar && tipoCaso === 'diario') {
    btnVoltar.href = '/diario';
  }

  let endpointAPI = '';
  let endpointMandado = '';

  if (tipoCaso === 'diario') {
    endpointAPI = '/api/casos/daily';
    endpointMandado = '/api/casos/daily/mandado';
  } else if (casoId) {
    endpointAPI = `/api/casos/${casoId}`;
    endpointMandado = `/api/casos/${casoId}/mandado`;
  } else {
    endpointAPI = '/api/casos/daily';
    endpointMandado = '/api/casos/daily/mandado'; 
  }

  try {
    const resposta = await fetch(endpointAPI);
    if (!resposta.ok) throw new Error('Caso não encontrado.');
    
    let caso = await resposta.json();
    if (Array.isArray(caso)) caso = caso[0];

    console.log('📦 Dados recebidos do Caso:', caso);
    renderizarCaso(caso);

  } catch (error) {
    console.error('Erro ao carregar caso:', error);
    const tituloEl = document.getElementById('titulo-caso');
    if (tituloEl) tituloEl.innerText = 'Erro ao carregar o caso.';
  }

  carregarCachePokemons();

  configurarAutocompletar();

  configurarModalDossie(endpointMandado, tipoCaso, casoId);
});

async function carregarCachePokemons() {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await res.json();
    listaPokemonsCache = data.results;
  } catch (e) {
    console.error('Erro ao carregar cache de Pokémon:', e);
  }
}

function configurarAutocompletar() {
  const input = document.getElementById('input-suspeito');
  const listaSugestoes = document.getElementById('sugestoes-lista');

  if (!input || !listaSugestoes) return;

  input.addEventListener('input', () => {
    const termo = input.value.trim().toLowerCase();
    listaSugestoes.innerHTML = '';

    if (termo.length < 2) {
      listaSugestoes.classList.add('oculto');
      return;
    }
    const filtrados = listaPokemonsCache.filter(p => p.name.includes(termo)).slice(0, 5);

    if (filtrados.length === 0) {
      listaSugestoes.classList.add('oculto');
      return;
    }

    filtrados.forEach(p => {
      const idMatch = p.url.match(/\/pokemon\/(\d+)\//);
      const idPokemon = idMatch ? idMatch[1] : '1';
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${idPokemon}.png`;

      const li = document.createElement('li');
      li.className = 'sugestao-item';
      li.innerHTML = `
        <img src="${spriteUrl}" alt="${p.name}" loading="lazy" />
        <span style="text-transform: capitalize;">${p.name}</span>
      `;

      li.addEventListener('click', () => {
        input.value = p.name;
        listaSugestoes.classList.add('oculto');
      });

      listaSugestoes.appendChild(li);
    });

    listaSugestoes.classList.remove('oculto');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const primeiroItem = listaSugestoes.querySelector('.sugestao-item');
      if (primeiroItem && !listaSugestoes.classList.contains('oculto')) {

        primeiroItem.click();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !listaSugestoes.contains(e.target)) {
      listaSugestoes.classList.add('oculto');
    }
  });
}

function configurarModalDossie(endpointMandado, tipoCaso, casoId) {
  const form = document.getElementById('form-mandado');
  const modal = document.getElementById('modal-dossie');
  const inputSuspeito = document.getElementById('input-suspeito');

  const imgSprite = document.getElementById('dossie-sprite');
  const nomePokemonEl = document.getElementById('dossie-nome-pokemon');
  const btnCancelar = document.getElementById('btn-cancelar-dossie');
  const btnConfirmar = document.getElementById('btn-confirmar-dossie');

  if (!form || !modal) return;

  let palpiteAtual = '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    palpiteAtual = inputSuspeito ? inputSuspeito.value.trim().toLowerCase() : '';

    if (!palpiteAtual) return;

    nomePokemonEl.innerText = palpiteAtual;
    imgSprite.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${palpiteAtual}`);
      if (res.ok) {
        const data = await res.json();
        imgSprite.src = data.sprites.front_default || '';
      }
    } catch (err) {
      console.log('Sprite não encontrado na PokéAPI para visualização prévia.');
    }

    modal.classList.remove('oculto');
  });

  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      modal.classList.add('oculto');
    });
  }

  const executarConfirmacao = async () => {
    modal.classList.add('oculto');

    try {
      const resposta = await fetch(endpointMandado, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palpite: palpiteAtual })
      });

      const dados = await resposta.json();

      dados.tipoCaso = tipoCaso;
      dados.casoId = casoId;
      dados.palpite = palpiteAtual;

      sessionStorage.setItem('resultado_investigacao', JSON.stringify(dados));
      window.location.href = '/conclusao';

    } catch (error) {
      console.error('Erro ao validar mandado:', error);
      alert('Erro ao conectar ao servidor para emitir mandado.'); 
    }
  };

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', executarConfirmacao);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !modal.classList.contains('oculto')) {
      e.preventDefault();
      executarConfirmacao();
    }
  });
}

function renderizarCaso(caso) {
  if (!caso) return;

  const tituloEl = document.getElementById('titulo-caso');
  if (tituloEl) {
    tituloEl.innerText = `${caso.numero_caso || ''} - ${caso.titulo || 'Sem Título'}`;
  }

  const rankEl = document.getElementById('rank-caso');
  if (rankEl) {
    rankEl.innerText = `RANK ${caso.rank || 'D'}`;
  }

  const containerPasta = document.getElementById('container-conteudo-caso');
  if (!containerPasta) return;

  containerPasta.innerHTML = '';

  if (caso.tipo_layout === 'planta_baixa') {
    renderizarLayoutPlantaBaixa(caso, containerPasta);
  } else if (caso.tipo_layout === 'documento_secreto') {
    renderizarLayoutDocumentoSecreto(caso, containerPasta);
  } else if (caso.tipo_layout === 'interrogatorio_confronto') {
    renderizarLayoutInterrogatorioConfronto(caso, containerPasta); 
  } else if (caso.tipo_layout === 'laboratorio' || caso.tipo_layout === 'laboratorio_medico') {
    renderizarLayoutLaboratorio(caso, containerPasta)
  } else {
    renderizarLayoutPadrao(caso, containerPasta);
  }
}

function renderizarLayoutPadrao(caso, container) {
  if (typeof window.exibirModalInstrucaoLayout === 'function') {
    window.exibirModalInstrucaoLayout('padrao', ehDiario);
}

  container.innerHTML = `
    <div class="carimbo-topo">RELATÓRIO DE INVESTIGAÇÃO PADRÃO</div>
    <div class="secao-doc">
      <h3>Resumo do Caso</h3>
      <p>${caso.relatorio || 'Nenhum relatório disponível para este caso.'}</p>
    </div>
    
    <div class="secao-doc">
      <h3>Pistas Registradas</h3>
      <ul class="lista-pistas">
        ${(caso.pistas || []).map(p => `<li><strong>${p.nome}:</strong> ${p.descricao_revelada}</li>`).join('')}
      </ul>
    </div>

    <div class="secao-doc">
      <h3>Depoimentos Oficiais</h3>
      <div class="container-depoimentos">
        ${(caso.depoimentos || []).map(d => `
          <div class="cartao-depoimento">
            <p><strong>${d.testemunha}:</strong> "${d.texto}"</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderizarLayoutPlantaBaixa(caso, container) {
  if (typeof window.exibirModalInstrucaoLayout === 'function') {
    window.exibirModalInstrucaoLayout('planta_baixa', ehDiario);
  }

  const imagemMapaUrl = caso.imagem_mapa || 'https://unsplash.com';

  container.innerHTML = `
    <div class="carimbo-topo" style="box-sizing: border-box; max-width: 100%;">PLANTA BAIXA - PERÍCIA DE CENA DO CRIME</div>
    
    <div class="secao-doc" style="margin-bottom: 15px; box-sizing: border-box; max-width: 100%;">
      <p><strong>Relatório Inicial:</strong> ${caso.relatorio || 'Inspecione a planta baixa com o pincel espectral para encontrar evidências ocultas.'}</p>
    </div>

    <div class="planta-baixa-wrapper" style="box-sizing: border-box; max-width: 100%; min-width: 0;">
      <!-- Barra de Lentes com Contadores Individuais -->
      <div class="barra-lentes" style="box-sizing: border-box; max-width: 100%;">
        <span class="titulo-lentes">Espectros:</span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-lente ativo-termico" data-filtro="termico" id="btn-lente-termico">
            🔴 Térmica <span class="badge-lente" id="count-termico">0/0</span>
          </button>
          <button type="button" class="btn-lente" data-filtro="uv" id="btn-lente-uv">
            🟣 UV <span class="badge-lente" id="count-uv">0/0</span>
          </button>
          <button type="button" class="btn-lente" data-filtro="impacto" id="btn-lente-impacto">
            🟡 Impacto <span class="badge-lente" id="count-impacto">0/0</span>
          </button>
        </div>
      </div>

      <!-- Mapa Interativo com Pincel Forense -->
      <div id="mapa-container" class="mapa-cenario-container filtro-termico modo-pincel" style="box-sizing: border-box; max-width: 100%;">
        <img src="${imagemMapaUrl}" alt="Planta Baixa do Local" class="mapa-imagem-fundo" />

        <!-- HUD de Telemetria do Scanner -->
        <div class="scanner-hud-overlay">
          <span id="scanner-coords">POS: 00% / 00%</span>
          <span id="scanner-sinal">SINAL: 0%</span>
        </div>

        <!-- Pincel Forense Interativo -->
        <div id="pincel-forense" class="pincel-forense">
          <svg class="pincel-anel-svg" viewBox="0 0 56 56">
            <circle class="pincel-anel-fundo" cx="28" cy="28" r="24"></circle>
            <circle id="pincel-anel-progresso" class="pincel-anel-progresso" cx="28" cy="28" r="24"></circle>
          </svg>
          <span class="pincel-icone">🖌️</span>
          <div id="pincel-aviso" class="pincel-aviso">VESTÍGIO DETETADO!</div>
        </div>

        <div id="hotspots-wrapper" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></div>
      </div>

      <!-- Barra de Status da Varredura -->
      <div class="barra-status-pericia" style="box-sizing: border-box; max-width: 100%; flex-wrap: wrap; gap: 8px;">
        <span id="contador-varredura">🖌️ Vestígios Coletados: <strong>0/${(caso.pistas || []).length}</strong></span>
        <span id="status-lente-atual">Lente Ativa: <strong>Térmica</strong></span>
      </div>

      <div class="painel-detalhe-pista" id="detalhe-pista-ativa" style="box-sizing: border-box; max-width: 100%; padding: 10px; background: #2b1d0c; color: #f4ebd9; border: 1px solid #5a3d28; border-radius: 4px; font-size: 0.85rem; overflow-wrap: break-word;">
        <em>🖌️ Passe o <strong>pincel forense</strong> pela planta baixa alternando as lentes. Observe o <strong>indicador de sinal</strong> no topo e mantenha o pincel parado ao detectar um vestígio.</em>
      </div>
    </div>

    <!-- PAINEL DE CORRELAÇÃO E DEDUÇÃO -->
    <div class="secao-doc" style="box-sizing: border-box; max-width: 100%; min-width: 0; margin-top: 22px; border-top: 2px dashed #5a3d28; padding-top: 15px;">
      <h3 style="color: #8b0000; margin-bottom: 8px;">🔬 Painel de Correlação e Dedução</h3>
      <p style="font-size: 0.85rem; color: #5a3d28; margin-bottom: 10px;">Compare os indícios coletados e combine dois vestígios que apontem para o mesmo aspecto do caso:</p>
      
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
        <select id="select-pista-1" style="flex: 1 1 200px; min-width: 0; max-width: 100%; box-sizing: border-box; padding: 7px; background: #2b1d0c; color: #f4ebd9; border: 1px solid #5a3d28; border-radius: 4px; font-size: 0.82rem;">
          <option value="">1º Vestígio Coletado...</option>
        </select>
        <select id="select-pista-2" style="flex: 1 1 200px; min-width: 0; max-width: 100%; box-sizing: border-box; padding: 7px; background: #2b1d0c; color: #f4ebd9; border: 1px solid #5a3d28; border-radius: 4px; font-size: 0.82rem;">
          <option value="">2º Vestígio Coletado...</option>
        </select>
      </div>
      
      <button type="button" id="btn-cruzar-dados" class="btn-cruzar-planta" style="box-sizing: border-box; max-width: 100%;">🔗 Cruzar Evidências Selecionadas</button>
      
      <div id="resultado-deducao" style="box-sizing: border-box; max-width: 100%; margin-top: 12px; font-size: 0.88rem; color: #2b1d0c; background: #fdf6ec; padding: 10px; border-left: 4px solid #8b0000; border-radius: 2px; overflow-wrap: break-word;">
        <em>Nenhuma correlação testada neste momento.</em>
      </div>
    </div>

    <!-- DOSSIÊ DE DESCOBERTAS CONSOLIDADAS -->
    <div class="secao-doc" style="box-sizing: border-box; max-width: 100%; min-width: 0; margin-top: 18px; background: #231709; padding: 14px; border: 1px solid #5a3d28; border-radius: 4px;">
      <h3 style="color: #ffcc00; margin-bottom: 8px; font-size: 0.95rem;">📂 Dossiê de Descobertas (Provas Consolidadas)</h3>
      <ul id="lista-dossie-descobertas" style="margin: 0; padding-left: 20px; color: #f4ebd9; font-size: 0.88rem; overflow-wrap: break-word;">
        <li style="font-style: italic; color: #aaa;" id="aviso-vazio-dossie">Nenhuma descoberta cruzada registrada ainda.</li>
      </ul>
    </div>

    <!-- DEPOIMENTOS OFICIAIS -->
    <div class="secao-doc" style="box-sizing: border-box; max-width: 100%; min-width: 0; margin-top: 18px;">
      <h3 style="color: #8b0000; margin-bottom: 10px;">Depoimentos Oficiais</h3>
      <div id="lista-depoimentos" class="container-depoimentos"></div>
    </div>
  `;

  const mapaContainer = container.querySelector('#mapa-container');
  const botoesLente = container.querySelectorAll('.btn-lente');
  const hotspotsWrapper = container.querySelector('#hotspots-wrapper');
  const detalhePistaBox = container.querySelector('#detalhe-pista-ativa');
  const contadorVarreduraEl = container.querySelector('#contador-varredura');
  const statusLenteEl = container.querySelector('#status-lente-atual');
  const scannerCoordsEl = container.querySelector('#scanner-coords');
  const scannerSinalEl = container.querySelector('#scanner-sinal');

  const pincelEl = container.querySelector('#pincel-forense');
  const pincelAnelProgresso = container.querySelector('#pincel-anel-progresso');
  const pincelAvisoEl = container.querySelector('#pincel-aviso');
  const circunferenciaPincel = 2 * Math.PI * 24;
  pincelAnelProgresso.style.strokeDasharray = `${circunferenciaPincel}`;
  pincelAnelProgresso.style.strokeDashoffset = `${circunferenciaPincel}`;

  const selectPista1 = container.querySelector('#select-pista-1');
  const selectPista2 = container.querySelector('#select-pista-2');
  const btnCruzarDados = container.querySelector('#btn-cruzar-dados');
  const resultadoDeducao = container.querySelector('#resultado-deducao');
  const listaDossie = container.querySelector('#lista-dossie-descobertas');
  const avisoVazioDossie = container.querySelector('#aviso-vazio-dossie');

  let filtroAtivo = 'termico';
  const pistas = caso.pistas || [];
  const pistasPorId = new Map(pistas.map(p => [p.id_pista, p]));
  const pistasColetadasIds = new Set();
  const descobertasRegistradas = new Set();
  const cruzamentosInvalidosTestados = new Set();

  let pistaAlvoAtual = null;
  let progressoVarredura = 0;
  let intervaloPincel = null;

  hotspotsWrapper.innerHTML = '';
  const filtrosDisponiveis = ['termico', 'uv', 'impacto'];
  const registrosPontos = [];

  function extrairPercentuais(coordString) {
    const topMatch = (coordString || '').match(/top:\s*([\d.]+)%/);
    const leftMatch = (coordString || '').match(/left:\s*([\d.]+)%/);
    return {
      y: topMatch ? parseFloat(topMatch[1]) : 50,
      x: leftMatch ? parseFloat(leftMatch[1]) : 50
    };
  }

  function formatarDescricaoPista(pista) {
    return `<strong>🔍 Vestígio (${pista.nome}):</strong> ${pista.descricao_revelada}`;
  }

  function adicionarOpcaoSelect(pista) {
    if (pistasColetadasIds.has(pista.id_pista)) return;
    pistasColetadasIds.add(pista.id_pista);

    [selectPista1, selectPista2].forEach(sel => {
      const opt = document.createElement('option');
      opt.value = pista.id_pista;
      opt.textContent = `📌 ${pista.nome}`;
      sel.appendChild(opt);
    });
  }

  function atualizarContadores() {
    const totalColetadas = registrosPontos.filter(r => r.coletada).length;
    contadorVarreduraEl.innerHTML = `🖌️ Vestígios Coletados: <strong>${totalColetadas}/${pistas.length}</strong>`;

    filtrosDisponiveis.forEach(f => {
      const pontosLente = registrosPontos.filter(r => r.filtro === f);
      const achadosLente = pontosLente.filter(r => r.coletada).length;
      const badgeEl = container.querySelector(`#count-${f}`);
      const btnEl = container.querySelector(`#btn-lente-${f}`);

      if (badgeEl) {
        badgeEl.textContent = `${achadosLente}/${pontosLente.length}`;
      }
      if (btnEl && pontosLente.length > 0 && achadosLente === pontosLente.length) {
        btnEl.classList.add('lente-concluida');
      }
    });
  }

  pistas.forEach((pista, index) => {
    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot-pista ponto-oculto';
    const filtroAtribuido = pista.lente || filtrosDisponiveis[index % filtrosDisponiveis.length];
    const coords = extrairPercentuais(pista.coordenadas_ou_alvo);

    hotspot.style.cssText = `
      position: absolute;
      top: ${coords.y}%;
      left: ${coords.x}%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 10;
    `;
    hotspot.innerHTML = `<span class="marcador-revelado">✓</span>`;

    const registro = {
      pista,
      hotspot,
      filtro: filtroAtribuido,
      x: coords.x,
      y: coords.y,
      coletada: false
    };

    hotspot.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!registro.coletada) return;
      detalhePistaBox.innerHTML = formatarDescricaoPista(pista);
    });

    registrosPontos.push(registro);
    hotspotsWrapper.appendChild(hotspot);
  });

  function resetarProgressoPincel() {
    if (intervaloPincel) {
      clearInterval(intervaloPincel);
      intervaloPincel = null;
    }
    pistaAlvoAtual = null;
    progressoVarredura = 0;
    pincelAnelProgresso.style.strokeDashoffset = `${circunferenciaPincel}`;
    pincelEl.classList.remove('vestigio-proximo');
  }

  function revelarVestigio(reg) {
    reg.coletada = true;
    reg.hotspot.classList.remove('ponto-oculto', 'vestigio-sinalizado');
    reg.hotspot.classList.add('coletada');
    reg.hotspot.style.pointerEvents = 'auto';

    detalhePistaBox.innerHTML = `✅ ${formatarDescricaoPista(reg.pista)}`;
    adicionarOpcaoSelect(reg.pista);
    atualizarContadores();
    resetarProgressoPincel();
  }

  function verificarProximidadePincel(mousePctX, mousePctY) {
    const RAIO_DETECCAO = 8.5;
    const RAIO_RADAR = 35;
    scannerCoordsEl.textContent = `POS: ${Math.round(mousePctX).toString().padStart(2, '0')}% / ${Math.round(mousePctY).toString().padStart(2, '0')}%`;
    let menorDistancia = Infinity;
    let encontrouProximo = null;

    for (const reg of registrosPontos) {
      if (reg.coletada || reg.filtro !== filtroAtivo) continue;
      const dist = Math.hypot(mousePctX - reg.x, mousePctY - reg.y);
      if (dist < menorDistancia) menorDistancia = dist;
      if (dist <= RAIO_DETECCAO && !encontrouProximo) {
        encontrouProximo = reg;
      }
    }

    if (menorDistancia === Infinity) {
      scannerSinalEl.textContent = 'SINAL: 0% (LIMPO)';
      scannerSinalEl.style.color = '#8fa38f';
    } else {
      const intensidade = Math.max(0, Math.min(100, Math.round((1 - (menorDistancia / RAIO_RADAR)) * 100)));
      scannerSinalEl.textContent = `SINAL: ${intensidade}%`;
      scannerSinalEl.style.color = intensidade >= 75 ? '#ffcc00' : (intensidade >= 35 ? '#f59e0b' : '#c5a378');
    }

    if (encontrouProximo) {
      encontrouProximo.hotspot.classList.add('vestigio-sinalizado');
      if (pistaAlvoAtual !== encontrouProximo) {
        resetarProgressoPincel();
        pistaAlvoAtual = encontrouProximo;
        pincelEl.classList.add('vestigio-proximo');
        pincelAvisoEl.textContent = '⚠️ VESTÍGIO! SEGURE AQUI';
        intervaloPincel = setInterval(() => {
          progressoVarredura += 4.5;
          const offset = circunferenciaPincel - (progressoVarredura / 100) * circunferenciaPincel;
          pincelAnelProgresso.style.strokeDashoffset = `${Math.max(0, offset)}`;
          if (progressoVarredura >= 100) {
            revelarVestigio(encontrouProximo);
          }
        }, 50);
      }
    } else {
      registrosPontos.forEach(r => {
        if (!r.coletada) r.hotspot.classList.remove('vestigio-sinalizado');
      });
      if (pistaAlvoAtual) {
        resetarProgressoPincel();
      }
    }
  }

  mapaContainer.addEventListener('mouseenter', () => {
    pincelEl.style.opacity = '1';
  });

  mapaContainer.addEventListener('mouseleave', () => {
    pincelEl.style.opacity = '0';
    scannerSinalEl.textContent = 'SINAL: --';
    resetarProgressoPincel();
  });

  mapaContainer.addEventListener('mousemove', (e) => {
    const rect = mapaContainer.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    pincelEl.style.left = `${relX}px`;
    pincelEl.style.top = `${relY}px`;
    verificarProximidadePincel((relX / rect.width) * 100, (relY / rect.height) * 100);
  });

  mapaContainer.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = mapaContainer.getBoundingClientRect();
    const relX = touch.clientX - rect.left;
    const relY = touch.clientY - rect.top;
    if (relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height) {
      e.preventDefault();
      pincelEl.style.opacity = '1';
      pincelEl.style.left = `${relX}px`;
      pincelEl.style.top = `${relY}px`;
      verificarProximidadePincel((relX / rect.width) * 100, (relY / rect.height) * 100);
    }
  }, { passive: false });

  mapaContainer.addEventListener('touchend', () => {
    pincelEl.style.opacity = '0';
    resetarProgressoPincel();
  });

  btnCruzarDados.addEventListener('click', () => {
    const v1 = selectPista1.value;
    const v2 = selectPista2.value;
    if (!v1 || !v2) {
      resultadoDeducao.innerHTML = '⚠️ Selecione dois vestígios coletados para cruzar os dados.';
      resultadoDeducao.style.borderLeftColor = '#d97706';
      return;
    }
    if (v1 === v2) {
      resultadoDeducao.innerHTML = '⚠️ Escolha dois vestígios distintos para encontrar uma correlação lógica.';
      resultadoDeducao.style.borderLeftColor = '#d97706';
      return;
    }

    const parOrdenado = [v1, v2].sort().join('+');
    const parDireto = `${v1}+${v2}`;
    const parInverso = `${v2}+${v1}`;
    const correlacoes = caso.correlacoes || {};
    const matchCorrelacao = correlacoes[parOrdenado] || correlacoes[parDireto] || correlacoes[parInverso];

    if (matchCorrelacao) {
      const textoDescoberta = typeof matchCorrelacao === 'string' ? matchCorrelacao : matchCorrelacao.texto;
      const corBorda = (typeof matchCorrelacao === 'object' && matchCorrelacao.cor) ? matchCorrelacao.cor : '#155724';
      resultadoDeducao.innerHTML = `✅ ${textoDescoberta}`;
      resultadoDeducao.style.borderLeftColor = corBorda;

      if (!descobertasRegistradas.has(parOrdenado)) {
        descobertasRegistradas.add(parOrdenado);
        if (avisoVazioDossie) {
          avisoVazioDossie.remove();
        }
        const li = document.createElement('li');
        li.style.marginBottom = '8px';
        li.innerHTML = textoDescoberta;
        listaDossie.appendChild(li);
      }
    } else {
      const jaTestado = cruzamentosInvalidosTestados.has(parOrdenado);
      cruzamentosInvalidosTestados.add(parOrdenado);
      const p1 = pistasPorId.get(v1);
      const p2 = pistasPorId.get(v2);
      const resumoPar = p1 && p2 ? ` <em>(${p1.nome} + ${p2.nome})</em>` : '';
      resultadoDeducao.innerHTML = `❌ <strong>Sem Correlação Direta${resumoPar}:</strong> Esses dois indícios não formam uma dedução consistente${jaTestado ? ' (já testado)' : ''}. Releia os detalhes coletados e tente combinar pistas que convergem.`;
      resultadoDeducao.style.borderLeftColor = '#8b0000';
    }
  });

  function atualizarFiltroLentes(novoFiltro) {
    filtroAtivo = novoFiltro;
    resetarProgressoPincel();
    scannerSinalEl.textContent = 'SINAL: --';
    const nomesLentes = { termico: 'Térmica', uv: 'UV (Fluido)', impacto: 'Impacto' };
    if (statusLenteEl) {
      statusLenteEl.innerHTML = `Lente Ativa: <strong>${nomesLentes[filtroAtivo] || filtroAtivo}</strong>`;
    }
    if (mapaContainer) {
      mapaContainer.className = `mapa-cenario-container filtro-${filtroAtivo} modo-pincel`;
    }
    botoesLente.forEach(btn => {
      const f = btn.getAttribute('data-filtro');
      const concluida = btn.classList.contains('lente-concluida');
      btn.className = `btn-lente${concluida ? ' lente-concluida' : ''}`;
      if (f === filtroAtivo) {
        if (filtroAtivo === 'termico') btn.classList.add('ativo-termico');
        if (filtroAtivo === 'uv') btn.classList.add('ativo-uv');
        if (filtroAtivo === 'impacto') btn.classList.add('ativo-impacto');
      }
    });
    registrosPontos.forEach(reg => {
      if (!reg.coletada) {
        reg.hotspot.classList.remove('vestigio-sinalizado');
      }
    });
  }

  botoesLente.forEach(btn => {
    btn.addEventListener('click', () => {
      atualizarFiltroLentes(btn.getAttribute('data-filtro'));
    });
  });

  atualizarContadores();
  atualizarFiltroLentes('termico');

  const listaDepoimentos = container.querySelector('#lista-depoimentos');
  if (listaDepoimentos && caso.depoimentos && caso.depoimentos.length > 0) {
    listaDepoimentos.innerHTML = '';
    caso.depoimentos.forEach(dep => {
      const div = document.createElement('div');
      div.className = 'cartao-depoimento';
      div.style.cssText = 'background: #2b1d0c; color: #f4ebd9; padding: 10px; margin-bottom: 8px; border-left: 3px solid #8b0000; border-radius: 3px; font-size: 0.9rem;';
      div.innerHTML = `<p><strong>${dep.testemunha || 'Testemunha'}:</strong> "${dep.texto}"</p>`;
      listaDepoimentos.appendChild(div);
    });
  } else if (listaDepoimentos) {
    listaDepoimentos.innerHTML = 'Nenhum depoimento registrado.';
  }
}

function renderizarLayoutDocumentoSecreto(caso, container) {
    if (typeof window.exibirModalInstrucaoLayout === 'function') {
    window.exibirModalInstrucaoLayout('documento_secreto', ehDiario);
  }

    if (window._cleanupPolysphereListeners) {
        window._cleanupPolysphereListeners();
        window._cleanupPolysphereListeners = null;
    }

    let relatorioProcessado = caso.relatorio || 'Nenhum documento restrito encontrado.';
    const idsTarjasNoTexto = [];

    relatorioProcessado = relatorioProcessado.replace(/\[TARJA:([^\]]+)\]/g, (match, conteudo) => {
        const pistaId = conteudo.trim();
        idsTarjasNoTexto.push(pistaId);
        return `<span class="tarja-preta-corrompida" data-pista-id="${pistaId}">🔒 [BLOCK]</span>`;
    });

    const totalTarjas = idsTarjasNoTexto.length;
    const margemAlinhamento = totalTarjas >= 3 ? 7 : 10;

    container.innerHTML = `
        <div class="carimbo-topo">RELATÓRIO CONFIDENCIAL - DECODIFICAÇÃO 3D (POLYSPHERE)</div>
        
        <div class="secao-doc">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; flex-wrap: wrap;">
                <h3 style="margin: 0;">Relatório de Inteligência Restrito</h3>
                <span class="badge-progresso-doc" id="contador-tarjas-doc">🔒 Blocos: 0/${totalTarjas}</span>
            </div>
            <div class="texto-censurado-bloco">
                <p>${relatorioProcessado}</p>
            </div>
            <p style="font-size: 0.8rem; color: #5a3d28; margin-top: 15px;">
                <em>💡 Dica: Clique nos blocos censurados para abrir o terminal 3D, selecionar a palavra-chave candidata e alinhar os estilhaços no espaço (${totalTarjas} ${totalTarjas === 1 ? 'chave necessária' : 'chaves necessárias'}).</em>
            </p>
        </div>

        <!-- 🔐 DECODIFICADOR DE ASSINATURA & ANEXO ULTRASSECRETO -->
        <div class="secao-doc painel-decodificador-doc">
            <h3 style="color: #8b0000; margin-bottom: 6px;">🔑 Decodificador de Assinatura & Anexo Ultrassecreto</h3>
            <p style="font-size: 0.82rem; color: #5a3d28; margin-bottom: 10px;">
                As palavras reconstruídas no espaço 3D formam a chave mestra para abrir o arquivo anexo restrito:
            </p>

            <div class="slots-chaves-3d-grid" id="grid-chaves-3d"></div>

            <button type="button" id="btn-abrir-anexo-secreto" class="btn-anexo-secreto" disabled>
                🔒 AGUARDANDO EXTRAÇÃO DAS CHAVES 3D (0/${totalTarjas})
            </button>

            <div id="box-anexo-ultrassecreto" class="box-anexo-ultrassecreto oculto">
                <div class="carimbo-anexo">📂 ARQUIVO ANEXO DESBLOQUEADO - PROVA MASTER</div>
                <p id="texto-anexo-ultrassecreto"></p>
            </div>
        </div>

        <div class="secao-doc">
            <h3>Pistas e Evidências Decodificadas</h3>
            <ul id="lista-pistas" class="lista-pistas">
                <li id="aviso-nenhuma-pista">Nenhuma evidência descriptografada até o momento.</li>
            </ul>
        </div>

        <div class="secao-doc">
            <h3>Depoimentos Oficiais</h3>
            <div id="lista-depoimentos" class="container-depoimentos"></div>
        </div>

        <!-- Modal do Minijogo Polysphere 3D -->
        <div id="modal-cripto" class="modal-descriptografia oculto">
            <div class="modal-conteudo-cripto">
                <h3>TERMINAL POLYSPHERE 3D</h3>
                <p id="modal-cripto-dica" style="margin-bottom: 10px; color: #f4ebd9; font-size: 0.85rem; line-height: 1.4;"></p>

                <!-- Seletor de Opções de Giro -->
                <div id="box-opcoes-giro" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 10px;"></div>
                
                <div id="polysphere-viewport" class="polysphere-viewport" style="overflow: hidden; position: relative;">
                    <div class="polysphere-mira"></div>
                    <div id="polysphere-esfera" class="polysphere-esfera"></div>
                    <div id="polysphere-aviso-encaixe" class="polysphere-aviso-encaixe">✨ SINCRONIZAÇÃO PERFEITA ✨</div>
                </div>

                <p id="modal-cripto-feedback" style="min-height: 18px; font-size: 0.78rem; color: #ffcc00; margin-top: 8px; text-align: center;"></p>
                
                <p style="font-size: 0.75rem; color: #c5a378; margin-top: 4px;">
                    <em>🖱️ Escolha uma opção de giro e arraste para alinhar os estilhaços no espaço 3D.</em>
                </p>
                
                <div class="modal-botoes-cripto" style="margin-top: 12px;">
                    <button type="button" id="btn-cancelar-cripto" class="btn-cripto-cancelar">Cancelar</button>
                    <button type="button" id="btn-verificar-polysphere" class="btn-cripto-confirmar">Consolidar Dados</button>
                </div>
            </div>
        </div>
    `;

    const tarjas = container.querySelectorAll('.tarja-preta-corrompida');
    const contadorTarjasEl = container.querySelector('#contador-tarjas-doc');
    const gridChaves3d = container.querySelector('#grid-chaves-3d');
    const btnAbrirAnexo = container.querySelector('#btn-abrir-anexo-secreto');
    const boxAnexoSecreto = container.querySelector('#box-anexo-ultrassecreto');
    const textoAnexoSecreto = container.querySelector('#texto-anexo-ultrassecreto');

    const listaPistas = container.querySelector('#lista-pistas');
    const avisoNenhumaPista = container.querySelector('#aviso-nenhuma-pista');
    const modalCripto = container.querySelector('#modal-cripto');
    const textoDica = container.querySelector('#modal-cripto-dica');
    const boxOpcoesGiro = container.querySelector('#box-opcoes-giro');
    const feedbackCripto = container.querySelector('#modal-cripto-feedback');
    const btnCancelarCripto = container.querySelector('#btn-cancelar-cripto');
    const btnVerificar = container.querySelector('#btn-verificar-polysphere');
    const viewport = container.querySelector('#polysphere-viewport');
    const esfera = container.querySelector('#polysphere-esfera');
    const avisoEncaixe = container.querySelector('#polysphere-aviso-encaixe');

    let tarjaAtivaSelecionada = null;
    let pistaAtivaObj = null;
    let opcaoGiroSelecionada = '';
    let fragmentosAtuais = [];
    const chavesDescobertas = new Map();
    let anexoDesbloqueado = false;

    let isDragging = false;
    let startX = 0, startY = 0;
    let rotX = 0, rotY = 0;
    let velX = 0, velY = 0;
    let animFrameId = null;
    let alinhado = false;

    const clipPathsPoligonos = [
        'polygon(10% 0%, 100% 5%, 90% 95%, 0% 100%)',
        'polygon(0% 15%, 95% 0%, 100% 85%, 5% 100%)',
        'polygon(5% 5%, 95% 0%, 100% 100%, 0% 90%)',
        'polygon(0% 0%, 100% 10%, 95% 90%, 10% 100%)'
    ];

    function normalizarTexto(str) {
        return (str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function embaralharArray(lista) {
        const copia = [...lista];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
    }

    function formatarIndiceChave(index) {
        return String(index + 1).padStart(2, '0');
    }

    function atualizarDecodificadorChaves() {
        contadorTarjasEl.textContent = `🔓 Blocos: ${chavesDescobertas.size}/${totalTarjas}`;
        gridChaves3d.innerHTML = '';

        idsTarjasNoTexto.forEach((id, index) => {
            const palavra = chavesDescobertas.get(id);
            const slot = document.createElement('div');
            const rotuloIndice = formatarIndiceChave(index);
            slot.className = `slot-chave-3d ${palavra ? 'desbloqueado' : 'bloqueado'}`;
            slot.innerHTML = palavra
                ? `<span>CHAVE ${rotuloIndice}</span><strong>${palavra.toUpperCase()}</strong>`
                : `<span>CHAVE ${rotuloIndice}</span><em>[BLOQUEADA]</em>`;
            gridChaves3d.appendChild(slot);
        });

        if (totalTarjas > 0 && chavesDescobertas.size >= totalTarjas && !anexoDesbloqueado) {
            btnAbrirAnexo.disabled = false;
            btnAbrirAnexo.textContent = '🔓 DESCRIPTOGRAFAR ANEXO ULTRASSECRETO';
        } else if (!anexoDesbloqueado) {
            btnAbrirAnexo.disabled = true;
            btnAbrirAnexo.textContent = `🔒 AGUARDANDO EXTRAÇÃO DAS CHAVES 3D (${chavesDescobertas.size}/${totalTarjas})`;
        }
    }

    btnAbrirAnexo.addEventListener('click', () => {
        if (anexoDesbloqueado) return;
        anexoDesbloqueado = true;
        btnAbrirAnexo.disabled = true;
        btnAbrirAnexo.textContent = '✅ ANEXO ULTRASSECRETO CONSOLIDADO';

        const textoAnexo = caso.anexo_ultrassecreto ||
            `Cruzamento criptográfico confirmado pelas chaves [${Array.from(chavesDescobertas.values()).map(v => v.toUpperCase()).join(' + ')}]. Os registros completos do laboratório estão liberados para emissão do Mandado de Prisão.`;

        textoAnexoSecreto.innerHTML = textoAnexo;
        boxAnexoSecreto.classList.remove('oculto');

        const liMaster = document.createElement('li');
        liMaster.style.marginTop = '6px';
        liMaster.innerHTML = `<strong>[PROVA MASTER] Anexo Ultrassecreto:</strong> ${textoAnexo}`;
        listaPistas.appendChild(liMaster);
    });

    function fatiarPalavraEmEstilhacos(palavra) {
        const limpa = normalizarTexto(palavra).toUpperCase();
        const pedacos = [];
        let i = 0;
        while (i < limpa.length) {
            const tamanho = (limpa.length - i > 3 && Math.random() > 0.35) ? 2 : 1;
            pedacos.push(limpa.slice(i, i + tamanho));
            i += tamanho;
        }
        return pedacos.length > 0 ? pedacos : ['DADO'];
    }

    function construirEstilhacos3D() {
        esfera.innerHTML = '';
        const perspectiva = 950;
        const qtdFragmentos = fragmentosAtuais.length;
        const larguraViewport = viewport.clientWidth || 420;
        const larguraMaximaUtil = Math.max(220, larguraViewport - 36);

        const escalaBase = qtdFragmentos >= 7 ? 0.82 : (qtdFragmentos >= 5 ? 0.92 : 1.05);
        const larguraPorCaractereBase = 26 * escalaBase;
        const gapBase = 5 * escalaBase;

        const largurasBase = fragmentosAtuais.map(frag => (frag.length * larguraPorCaractereBase) + (14 * escalaBase));
        const larguraTotalBase = largurasBase.reduce((acc, w) => acc + w, 0) + ((qtdFragmentos - 1) * gapBase);

        const fatorAjusteLargura = larguraTotalBase > larguraMaximaUtil
            ? (larguraMaximaUtil / larguraTotalBase) * 0.94
            : 1;

        const escalaFinal = escalaBase * fatorAjusteLargura;
        const larguraPorCaractere = 26 * escalaFinal;
        const gapEntreBlocos = 5 * escalaFinal;

        const larguras = fragmentosAtuais.map(frag => (frag.length * larguraPorCaractere) + (14 * escalaFinal));
        const larguraTotal = larguras.reduce((acc, w) => acc + w, 0) + ((qtdFragmentos - 1) * gapEntreBlocos);

        let cursorX = -larguraTotal / 2;

        fragmentosAtuais.forEach((frag, idx) => {
            const bloco = document.createElement('div');
            bloco.className = 'polysphere-fragmento';
            bloco.textContent = frag;
            bloco.style.clipPath = clipPathsPoligonos[idx % clipPathsPoligonos.length];
            bloco.style.fontSize = `${Math.max(13, Math.min(20, Math.round(18 * escalaFinal)))}px`;
            bloco.style.padding = `5px ${Math.max(6, Math.round(10 * escalaFinal))}px`;

            const larguraBloco = larguras[idx];
            const targetX = cursorX + (larguraBloco / 2);
            cursorX += larguraBloco + gapEntreBlocos;

            const targetY = 0;
            const z = ((idx % 2 === 0 ? 1 : -1) * (15 + Math.random() * 20));

            const fatorEscala = (perspectiva - z) / perspectiva;
            const posX = targetX * fatorEscala;
            const posY = targetY * fatorEscala;

            bloco.style.transform = `translate3d(-50%, -50%, 0) translate3d(${posX}px, ${posY}px, ${z}px) scale(${fatorEscala.toFixed(3)})`;
            esfera.appendChild(bloco);
        });
    }

    function embaralharGiroInicial() {
        const dispersaoBase = totalTarjas >= 3 ? 65 : 45;
        const variacaoExtra = totalTarjas >= 3 ? 100 : 80;
        rotX = (Math.random() > 0.5 ? 1 : -1) * (dispersaoBase + Math.random() * variacaoExtra);
        rotY = (Math.random() > 0.5 ? 1 : -1) * (dispersaoBase + Math.random() * variacaoExtra);
        velX = 0;
        velY = 0;
        alinhado = false;
        esfera.classList.remove('alinhado-perfeito');
        avisoEncaixe.style.display = 'none';
    }

    function aplicarOpcaoGiro(opcao) {
        opcaoGiroSelecionada = opcao;
        feedbackCripto.textContent = '';

        const botoesOpcao = boxOpcoesGiro.querySelectorAll('.btn-opcao-giro');
        botoesOpcao.forEach(btn => {
            const ativa = btn.getAttribute('data-opcao') === opcao;
            btn.style.background = ativa ? '#8b0000' : '#2b1d0c';
            btn.style.color = ativa ? '#ffcc00' : '#f4ebd9';
            btn.style.borderColor = ativa ? '#ffcc00' : '#5a3d28';
        });

        fragmentosAtuais = fatiarPalavraEmEstilhacos(opcao);
        embaralharGiroInicial();
        construirEstilhacos3D();
    }

    function renderizarOpcoesGiro(pistaObj) {
        boxOpcoesGiro.innerHTML = '';
        const respostaCorreta = (pistaObj && (pistaObj.palavra_chave_resposta || pistaObj.descricao_revelada)) || 'SEGREDO';
        const rawOpcoes = Array.isArray(pistaObj && pistaObj.opcoes_giro) && pistaObj.opcoes_giro.length > 0
            ? pistaObj.opcoes_giro
            : [respostaCorreta];

        const opcoesUnicas = Array.from(new Set(rawOpcoes.map(o => String(o).trim()).filter(Boolean)));
        if (!opcoesUnicas.some(o => normalizarTexto(o) === normalizarTexto(respostaCorreta))) {
            opcoesUnicas.push(respostaCorreta);
        }

        const opcoesEmbaralhadas = embaralharArray(opcoesUnicas);

        opcoesEmbaralhadas.forEach(opcao => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-opcao-giro';
            btn.setAttribute('data-opcao', opcao);
            btn.textContent = opcao.toUpperCase();
            btn.style.cssText = 'padding: 5px 10px; border-radius: 4px; border: 1px solid #5a3d28; background: #2b1d0c; color: #f4ebd9; font-size: 0.75rem; font-weight: bold; cursor: pointer;';
            btn.addEventListener('click', () => aplicarOpcaoGiro(opcao));
            boxOpcoesGiro.appendChild(btn);
        });

        aplicarOpcaoGiro(opcoesEmbaralhadas[0]);
    }

    function normalizarAngulo(angulo) {
        let a = angulo % 360;
        if (a > 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    }

    function loopRenderizacao3D() {
        if (!isDragging) {
            rotY += velX;
            rotX += velY;
            velX *= 0.92;
            velY *= 0.92;
            const normX = normalizarAngulo(rotX);
            const normY = normalizarAngulo(rotY);
            if (Math.abs(normX) < 14 && Math.abs(normY) < 14) {
                rotX -= normX * 0.15;
                rotY -= normY * 0.15;
            }
        }
        const diffX = Math.abs(normalizarAngulo(rotX));
        const diffY = Math.abs(normalizarAngulo(rotY));
        if (diffX < margemAlinhamento && diffY < margemAlinhamento) {
            if (!alinhado) {
                alinhado = true;
                esfera.classList.add('alinhado-perfeito');
                avisoEncaixe.style.display = 'block';
            }
        } else {
            if (alinhado) {
                alinhado = false;
                esfera.classList.remove('alinhado-perfeito');
                avisoEncaixe.style.display = 'none';
            }
        }
        esfera.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        animFrameId = requestAnimationFrame(loopRenderizacao3D);
    }

    tarjas.forEach(tarja => {
        const pistaId = tarja.getAttribute('data-pista-id');
        const pistaObj = (caso.pistas || []).find(p => p.id_pista === pistaId);
        tarja.addEventListener('click', () => {
            if (tarja.classList.contains('revelada')) return;
            tarjaAtivaSelecionada = tarja;
            pistaAtivaObj = pistaObj;
            feedbackCripto.textContent = '';

            let dicaTexto = "Selecione a palavra correta nas opções de giro e alinhe os estilhaços no espaço 3D.";
            if (pistaObj && (pistaObj.dica_contexto || pistaObj.dica_descriptografia)) {
                dicaTexto = pistaObj.dica_contexto || pistaObj.dica_descriptografia;
            }
            textoDica.innerHTML = `🔓 Setor: <strong>${pistaObj ? pistaObj.nome : 'Segurança'}</strong><br><em>${dicaTexto}</em>`;

            renderizarOpcoesGiro(pistaObj);
            modalCripto.classList.remove('oculto');
            construirEstilhacos3D();
            if (animFrameId) cancelAnimationFrame(animFrameId);
            loopRenderizacao3D();
        });
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        velX = deltaX * 0.45;
        velY = -deltaY * 0.45;
        rotY += velX;
        rotX += velY;
        startX = e.clientX;
        startY = e.clientY;
    }

    function onMouseUp() {
        isDragging = false;
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        const t = e.touches[0];
        if (!t) return;
        const deltaX = t.clientX - startX;
        const deltaY = t.clientY - startY;
        velX = deltaX * 0.45;
        velY = -deltaY * 0.45;
        rotY += velX;
        rotX += velY;
        startX = t.clientX;
        startY = t.clientY;
    }

    function onTouchEnd() {
        isDragging = false;
    }

    viewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        velX = 0;
        velY = 0;
    });

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    viewport.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        if (!t) return;
        isDragging = true;
        startX = t.clientX;
        startY = t.clientY;
        velX = 0;
        velY = 0;
    }, { passive: true });

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    window._cleanupPolysphereListeners = () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
    };

    function fecharModal() {
        modalCripto.classList.add('oculto');
        if (animFrameId) cancelAnimationFrame(animFrameId);
    }

    if (btnCancelarCripto) {
        btnCancelarCripto.addEventListener('click', fecharModal);
    }

    function verificarConsolidacao() {
        if (!tarjaAtivaSelecionada) return;
        const diffX = Math.abs(normalizarAngulo(rotX));
        const diffY = Math.abs(normalizarAngulo(rotY));
        const palavraEsperada = ((pistaAtivaObj && (pistaAtivaObj.palavra_chave_resposta || pistaAtivaObj.descricao_revelada)) || 'dado').trim();
        const opcaoCorreta = normalizarTexto(opcaoGiroSelecionada) === normalizarTexto(palavraEsperada);

        if (diffX < margemAlinhamento && diffY < margemAlinhamento && opcaoCorreta) {
            fecharModal();
            const textoFinalRevelado = (pistaAtivaObj && pistaAtivaObj.descricao_revelada) || palavraEsperada;
            const pistaId = tarjaAtivaSelecionada.getAttribute('data-pista-id');
            tarjaAtivaSelecionada.classList.add('revelada');
            tarjaAtivaSelecionada.innerText = textoFinalRevelado;
            chavesDescobertas.set(pistaId, palavraEsperada);
            atualizarDecodificadorChaves();
            if (avisoNenhumaPista) {
                avisoNenhumaPista.remove();
            }
            if (pistaAtivaObj) {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${pistaAtivaObj.nome}:</strong> ${textoFinalRevelado}`;
                listaPistas.appendChild(li);
            }
        } else {
            if (diffX < margemAlinhamento && diffY < margemAlinhamento && !opcaoCorreta) {
                feedbackCripto.textContent = `⚠️ A palavra "${opcaoGiroSelecionada.toUpperCase()}" não corresponde a esta evidência. Teste outra opção de giro!`;
            } else {
                feedbackCripto.textContent = '⚠️ Alinhe os estilhaços no centro antes de consolidar.';
            }
            viewport.classList.add('erro-tremor');
            setTimeout(() => viewport.classList.remove('erro-tremor'), 400);
        }
    }

    if (btnVerificar) {
        btnVerificar.addEventListener('click', verificarConsolidacao);
    }

    atualizarDecodificadorChaves();

    const listaDepoimentos = container.querySelector('#lista-depoimentos');
    if (listaDepoimentos && caso.depoimentos && caso.depoimentos.length > 0) {
        listaDepoimentos.innerHTML = '';
        caso.depoimentos.forEach(dep => {
            const div = document.createElement('div');
            div.className = 'cartao-depoimento';
            div.style.cssText = 'background: #2b1d0c; color: #f4ebd9; padding: 10px; margin-bottom: 8px; border-left: 3px solid #8b0000; border-radius: 3px; font-size: 0.9rem;';
            div.innerHTML = `<p><strong>${dep.testemunha || 'Testemunha'}:</strong> "${dep.texto}"</p>`;
            listaDepoimentos.appendChild(div);
        });
    } else if (listaDepoimentos) {
        listaDepoimentos.innerHTML = 'Nenhum depoimento registrado.';
    }
}

function renderizarLayoutInterrogatorioConfronto(caso, container) {
    if (typeof window.exibirModalInstrucaoLayout === 'function') {
    window.exibirModalInstrucaoLayout('interrogatorio_confronto', ehDiario);
  }

    if (window._cleanupInterrogatorioLoops) {
        window._cleanupInterrogatorioLoops();
        window._cleanupInterrogatorioLoops = null;
    }

    container.innerHTML = `
      <div class="carimbo-topo">GABINETE DE INTERROGATÓRIO - TESTE DE POLÍGRAFO</div>
      
      <div class="secao-doc" style="margin-bottom: 12px;">
        <p><strong>Relatório:</strong> ${caso.relatorio || 'Analise as declarações, selecione pares de frases para cruzar e acione o polígrafo no momento do stress.'}</p>
      </div>

      <div class="confronto-wrapper" style="display: flex; flex-direction: column; gap: 14px; padding-bottom: 30px;">
        <div class="cartoes-testemunhas-grid" id="grid-testemunhas"></div>

        <div class="painel-poligrafo-confronto" id="painel-poligrafo">
          <div class="poligrafo-titulo">
            <span>MONITOR DE STRESS (POLÍGRAFO)</span>
            <span id="status-poligrafo">SISTEMA: AGUARDANDO SELEÇÃO DE DUPLA</span>
          </div>
          
          <div class="monitor-container">
            <canvas id="canvas-ecg-poligrafo" width="420" height="46"></canvas>
            <span class="bpm-indicador" id="bpm-display">72 BPM</span>
          </div>

          <div class="slots-confronto">
            <div class="slot-item" id="slot-a"><strong>Versão A:</strong> <em>Nenhuma</em></div>
            <span>⚡</span>
            <div class="slot-item" id="slot-b"><strong>Versão B:</strong> <em>Nenhuma</em></div>
          </div>

          <div class="barra-timing-wrapper" id="barra-timing">
            <div class="zona-alvo-indicador" id="zona-alvo" title="Janela de Pico de Stress"></div>
            <div class="barra-timing-fill" id="timing-fill"></div>
          </div>

          <button type="button" id="btn-confrontar" class="btn-confrontar-versao" disabled style="margin-top: 12px; position: relative; z-index: 5;">⚡ TESTAR CONFRONTO NO POLÍGRAFO</button>
        </div>

        <div class="painel-detalhe-pista" id="detalhe-confronto">
          <em>💡 <strong>Instrução:</strong> Selecione duas frases de testemunhas para cruzar. Se uma testemunha atingir o nível crítico (🔴 Hostil), insistir em confrontá-la custará horas extras de investigação!</em>
        </div>
      </div>
    `;

    const gridTestemunhas = container.querySelector('#grid-testemunhas');
    const slotA = container.querySelector('#slot-a');
    const slotB = container.querySelector('#slot-b');
    const btnConfrontar = container.querySelector('#btn-confrontar');
    const painelPoligrafo = container.querySelector('#painel-poligrafo');
    const statusPoligrafo = container.querySelector('#status-poligrafo');
    const detalheBox = container.querySelector('#detalhe-confronto');
    const barraTiming = container.querySelector('#barra-timing');
    const timingFill = container.querySelector('#timing-fill');
    const zonaAlvo = container.querySelector('#zona-alvo');

    const canvasEcg = container.querySelector('#canvas-ecg-poligrafo');
    const ctxEcg = canvasEcg.getContext('2d');
    const bpmDisplay = container.querySelector('#bpm-display');

    const depoimentos = caso.depoimentos || [];
    const confrontosCorretos = caso.confrontos_corretos || [];
    const confrontosComPista = confrontosCorretos.filter(c => Boolean(c.pista_id));
    const totalPistasPossiveis = confrontosComPista.length;
    const pistasGlobais = caso.pistas || [];

    const tensaoTestemunhas = depoimentos.map(() => 1);

    let selecaoA = null;
    let selecaoB = null;
    let emMinijogoAtivo = false;
    let startTime = null;
    let animacaoFrame = null;
    let ecgFrameId = null;
    let layoutAtivo = true;

    const paresResolvidos = new Set();
    const divergenciasSemPistaTestadas = new Set();
    let pistasDescobertasHtml = "";

    const duracaoMinijogo = 3500;
    let zonaAlvoInicio = 30;
    let zonaAlvoFim = 60;

    let estadoOndaEcg = 'normal';
    let ecgOffset = 0;

    function animarMonitorECG() {
        if (!layoutAtivo) return;
        const w = canvasEcg.width;
        const h = canvasEcg.height;
        ctxEcg.clearRect(0, 0, w, h);

        ctxEcg.strokeStyle = 'rgba(217, 119, 6, 0.14)';
        ctxEcg.lineWidth = 1;
        for (let x = 0; x < w; x += 28) {
            ctxEcg.beginPath(); ctxEcg.moveTo(x, 0); ctxEcg.lineTo(x, h); ctxEcg.stroke();
        }

        let velocidade = 1.2;
        let frequenciaOscilacao = 1.0;
        let corLinha = '#ffcc00';
        let bpmTexto = '72 BPM';

        if (estadoOndaEcg === 'acerto') {
            velocidade = 0.6;
            frequenciaOscilacao = 0.6;
            corLinha = '#28a745';
            bpmTexto = '56 BPM';
        } else if (estadoOndaEcg === 'erro') {
            velocidade = 3.0;
            frequenciaOscilacao = 2.2;
            corLinha = '#ff4d4d';
            bpmTexto = '144 BPM';
        }

        bpmDisplay.textContent = bpmTexto;
        bpmDisplay.style.color = corLinha;

        ctxEcg.strokeStyle = corLinha;
        ctxEcg.shadowColor = corLinha;
        ctxEcg.shadowBlur = 5;
        ctxEcg.lineWidth = 2;
        ctxEcg.beginPath();

        for (let x = 0; x < w; x++) {
            const ciclo = ((x * frequenciaOscilacao) + ecgOffset) % 70;
            let y = h / 2;

            if (ciclo > 20 && ciclo <= 24) {
                y -= 4;
            } else if (ciclo > 28 && ciclo <= 31) {
                y += 5;
            } else if (ciclo > 31 && ciclo <= 35) {
                y -= 13 * (frequenciaOscilacao > 1 ? 1.2 : 0.8);
            } else if (ciclo > 35 && ciclo <= 39) {
                y += 7;
            }

            x === 0 ? ctxEcg.moveTo(x, y) : ctxEcg.lineTo(x, y);
        }
        ctxEcg.stroke();
        ctxEcg.shadowBlur = 0;

        ecgOffset += velocidade;
        ecgFrameId = requestAnimationFrame(animarMonitorECG);
    }

    window._cleanupInterrogatorioLoops = () => {
        layoutAtivo = false;
        if (animacaoFrame) cancelAnimationFrame(animacaoFrame);
        if (ecgFrameId) cancelAnimationFrame(ecgFrameId);
    };

    animarMonitorECG();

    function atualizarCartaoTestemunha(idx) {
        const nivel = tensaoTestemunhas[idx];
        const badge = container.querySelector(`#badge-tensao-${idx}`);
        const btnAcalmarInd = container.querySelector(`#btn-acalmar-ind-${idx}`);
        const card = container.querySelector(`#card-testemunha-${idx}`);

        if (!badge || !card) return;

        card.classList.remove('estado-calmo', 'estado-defensivo', 'estado-hostil');
        badge.className = 'badge-tensao-ind';

        if (nivel === 1) {
            card.classList.add('estado-calmo');
            badge.classList.add('verde');
            badge.textContent = '🟢 Calma';
            if (btnAcalmarInd) btnAcalmarInd.classList.add('oculto');
        } else if (nivel === 2) {
            card.classList.add('estado-defensivo');
            badge.classList.add('amarelo');
            badge.textContent = '🟡 Defensiva';
            if (btnAcalmarInd) btnAcalmarInd.classList.remove('oculto');
        } else {
            card.classList.add('estado-hostil');
            badge.classList.add('vermelho');
            badge.textContent = '🔴 Hostil (-5h/teste)';
            if (btnAcalmarInd) btnAcalmarInd.classList.remove('oculto');
        }

        atualizarTextoBotaoConfronto();
    }

    function calcularCustoExtraSelecao() {
        let custo = 0;
        if (selecaoA && tensaoTestemunhas[selecaoA.testemunhaIdx] >= 3) custo += 5;
        if (selecaoB && tensaoTestemunhas[selecaoB.testemunhaIdx] >= 3) custo += 5;
        return custo;
    }

    function atualizarTextoBotaoConfronto() {
        if (emMinijogoAtivo) return;
        if (selecaoA && selecaoB) {
            btnConfrontar.disabled = false;
            btnConfrontar.style.background = '';
            btnConfrontar.style.opacity = '1';
            btnConfrontar.style.cursor = 'pointer';

            const custoExtra = calcularCustoExtraSelecao();
            if (custoExtra > 0) {
                btnConfrontar.textContent = `⚡ TESTAR CONFRONTO (⚠️ -${custoExtra}h POR HOSTILIDADE)`;
                btnConfrontar.style.background = '#9a3412';
            } else {
                btnConfrontar.textContent = '⚡ TESTAR CONFRONTO NO POLÍGRAFO';
            }
        }
    }

    gridTestemunhas.innerHTML = '';

    depoimentos.forEach((dep, index) => {
        const card = document.createElement('div');
        card.className = 'cartao-testemunha-confronto estado-calmo';
        card.id = `card-testemunha-${index}`;

        let htmlFrases = '';
        if (dep.frases && Array.isArray(dep.frases)) {
            dep.frases.forEach(f => {
                htmlFrases += `<span class="frase-confronto" data-id="${f.id}" data-testemunha-idx="${index}">${f.texto}</span>`;
            });
        }

        card.innerHTML = `
            <div class="cabecalho-testemunha-ind">
                <h4>👤 ${dep.testemunha}</h4>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span id="badge-tensao-${index}" class="badge-tensao-ind verde">🟢 Calma</span>
                    <button type="button" id="btn-acalmar-ind-${index}" class="btn-acalmar-ind oculto" title="Fazer pausa tática com esta testemunha (-8h)">☕ -8h</button>
                </div>
            </div>
            <div class="lista-frases-container">${htmlFrases}</div>
        `;
        gridTestemunhas.appendChild(card);

        const btnAcalmarInd = card.querySelector(`#btn-acalmar-ind-${index}`);
        btnAcalmarInd.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emMinijogoAtivo || tensaoTestemunhas[index] <= 1) return;

            if (typeof window.descontarHoras === 'function') {
                window.descontarHoras(8);
            } else if (typeof caso.horas_restantes === 'number') {
                caso.horas_restantes = Math.max(0, caso.horas_restantes - 8);
            }

            tensaoTestemunhas[index] = Math.max(1, tensaoTestemunhas[index] - 1);
            atualizarCartaoTestemunha(index);

            const historicoAtual = pistasDescobertasHtml
                ? `<div style="margin-top: 10px;"><strong>📊 Pistas já extraídas:</strong>${pistasDescobertasHtml}</div>`
                : '';

            detalheBox.innerHTML = `<div>☕ <strong>Pausa com ${dep.testemunha} (-8h):</strong> Você reduziu a pressão sobre esta testemunha. O nível de tensão dela baixou.</div>${historicoAtual}`;
            detalheBox.style.background = '#e0f2fe';
            detalheBox.style.borderColor = '#0284c7';
        });
    });

    const spansFrases = container.querySelectorAll('.frase-confronto');
    spansFrases.forEach(span => {
        span.addEventListener('click', () => {
            if (emMinijogoAtivo) return;

            const id = span.getAttribute('data-id');
            const testemunhaIdx = parseInt(span.getAttribute('data-testemunha-idx'), 10);
            const nomeTestemunha = depoimentos[testemunhaIdx]?.testemunha || `Testemunha ${testemunhaIdx + 1}`;
            const texto = span.textContent;

            if (selecaoA && selecaoA.id === id) {
                span.classList.remove('selecionada');
                selecaoA = null;
                slotA.innerHTML = `<strong>Versão A:</strong> <em>Nenhuma</em>`;
                btnConfrontar.disabled = true;
                btnConfrontar.textContent = '⚡ TESTAR CONFRONTO NO POLÍGRAFO';
                return;
            }

            if (selecaoB && selecaoB.id === id) {
                span.classList.remove('selecionada');
                selecaoB = null;
                slotB.innerHTML = `<strong>Versão B:</strong> <em>Nenhuma</em>`;
                btnConfrontar.disabled = true;
                btnConfrontar.textContent = '⚡ TESTAR CONFRONTO NO POLÍGRAFO';
                return;
            }

            if (selecaoA && selecaoA.testemunhaIdx === testemunhaIdx) {
                container.querySelectorAll(`[data-testemunha-idx="${testemunhaIdx}"]`).forEach(s => s.classList.remove('selecionada'));
                if (selecaoB) selecaoB.spanEl?.classList.add('selecionada');
                span.classList.add('selecionada');
                selecaoA = { id, texto, testemunhaIdx, nomeTestemunha, spanEl: span };
                slotA.innerHTML = `<strong>${nomeTestemunha}:</strong> "${texto}"`;
            } else if (selecaoB && selecaoB.testemunhaIdx === testemunhaIdx) {
                container.querySelectorAll(`[data-testemunha-idx="${testemunhaIdx}"]`).forEach(s => s.classList.remove('selecionada'));
                if (selecaoA) selecaoA.spanEl?.classList.add('selecionada');
                span.classList.add('selecionada');
                selecaoB = { id, texto, testemunhaIdx, nomeTestemunha, spanEl: span };
                slotB.innerHTML = `<strong>${nomeTestemunha}:</strong> "${texto}"`;
            } else if (!selecaoA) {
                span.classList.add('selecionada');
                selecaoA = { id, texto, testemunhaIdx, nomeTestemunha, spanEl: span };
                slotA.innerHTML = `<strong>${nomeTestemunha}:</strong> "${texto}"`;
            } else if (!selecaoB) {
                span.classList.add('selecionada');
                selecaoB = { id, texto, testemunhaIdx, nomeTestemunha, spanEl: span };
                slotB.innerHTML = `<strong>${nomeTestemunha}:</strong> "${texto}"`;
            } else {
                if (selecaoB.spanEl) selecaoB.spanEl.classList.remove('selecionada');
                span.classList.add('selecionada');
                selecaoB = { id, texto, testemunhaIdx, nomeTestemunha, spanEl: span };
                slotB.innerHTML = `<strong>${nomeTestemunha}:</strong> "${texto}"`;
            }

            atualizarTextoBotaoConfronto();
        });
    });

    btnConfrontar.addEventListener('click', () => {
        if (!selecaoA || !selecaoB) return;

        if (!emMinijogoAtivo) {
            const custoExtra = calcularCustoExtraSelecao();
            if (custoExtra > 0) {
                if (typeof window.descontarHoras === 'function') {
                    window.descontarHoras(custoExtra);
                } else if (typeof caso.horas_restantes === 'number') {
                    caso.horas_restantes = Math.max(0, caso.horas_restantes - custoExtra);
                }
            }

            emMinijogoAtivo = true;
            painelPoligrafo.classList.add('modo-teste-ativo');
            statusPoligrafo.textContent = 'ESTADO: 🚨 ANALISANDO REAÇÃO PSICOLÓGICA...';
            statusPoligrafo.style.color = '#ff4d4d';
            barraTiming.classList.add('ativo');

            const larguraZona = 12;
            zonaAlvoInicio = Math.floor(Math.random() * (60 - larguraZona)) + 25;
            zonaAlvoFim = zonaAlvoInicio + larguraZona;

            zonaAlvo.style.left = `${zonaAlvoInicio}%`;
            zonaAlvo.style.width = `${larguraZona}%`;

            const avisoCusto = custoExtra > 0 ? ` <em>(-${custoExtra}h aplicadas pela hostilidade)</em>` : '';
            detalheBox.innerHTML = `⏳ <strong>Polígrafo Ativo!</strong>${avisoCusto} A barra de stress está descendo. Clique quando o indicador passar pela <strong>zona dourada aleatória</strong>!`;
            detalheBox.style.background = '#fef3c7';
            detalheBox.style.borderColor = '#d97706';

            btnConfrontar.textContent = '🎯 CLICAR NO PICO DE STRESS!';
            btnConfrontar.style.background = '#b91c1c';

            startTime = performance.now();

            function animarBarra(timestamp) {
                if (!layoutAtivo || !emMinijogoAtivo) return;
                const decorrido = timestamp - startTime;
                const progresso = Math.min((decorrido / duracaoMinijogo) * 100, 100);
                const porcentagemAtual = 100 - progresso;

                timingFill.style.width = `${porcentagemAtual}%`;

                if (decorrido < duracaoMinijogo && emMinijogoAtivo) {
                    animacaoFrame = requestAnimationFrame(animarBarra);
                } else if (emMinijogoAtivo) {
                    finalizarMinijogo(false, false, "⏰ Tempo esgotado! O polígrafo estabilizou sem registrar picos.");
                }
            }

            animacaoFrame = requestAnimationFrame(animarBarra);
        } else {
            if (animacaoFrame) cancelAnimationFrame(animacaoFrame);
            const decorrido = performance.now() - startTime;
            const progresso = Math.min((decorrido / duracaoMinijogo) * 100, 100);
            const porcentagemAtual = 100 - progresso;

            const acertouTiming = (porcentagemAtual >= zonaAlvoInicio && porcentagemAtual <= zonaAlvoFim);

            const confrontoEncontrado = confrontosCorretos.find(c =>
                (c.frase_a_id === selecaoA?.id && c.frase_b_id === selecaoB?.id) ||
                (c.frase_a_id === selecaoB?.id && c.frase_b_id === selecaoA?.id)
            );

            if (confrontoEncontrado && confrontoEncontrado.pista_id && paresResolvidos.has(confrontoEncontrado.id_par)) {
                emMinijogoAtivo = false;
                barraTiming.classList.remove('ativo');
                painelPoligrafo.classList.remove('modo-teste-ativo');

                const historicoAtual = pistasDescobertasHtml
                    ? `<div style="margin-top: 10px;"><strong>📊 Pistas já extraídas:</strong>${pistasDescobertasHtml}</div>`
                    : '';

                detalheBox.innerHTML = `<div>⚠️ Esta contradição já foi descoberta e registrada anteriormente. Procure outro cruzamento!</div>${historicoAtual}`;
                detalheBox.style.background = '#fef3c7';
                detalheBox.style.borderColor = '#d97706';
                statusPoligrafo.textContent = 'ESTADO: 🟡 PAR JÁ REGISTRADO';
                statusPoligrafo.style.color = '#ffcc00';
                atualizarTextoBotaoConfronto();
                return;
            }

            const acertouLogica = (confrontoEncontrado !== undefined);

            if (acertouLogica && acertouTiming && confrontoEncontrado.pista_id) {
                paresResolvidos.add(confrontoEncontrado.id_par);

                const pistaObj = pistasGlobais.find(p => p.id_pista === confrontoEncontrado.pista_id) || { descricao_revelada: "Contradição confirmada!" };
                const todasResolvidas = totalPistasPossiveis > 0 && paresResolvidos.size >= totalPistasPossiveis;

                pistasDescobertasHtml += `<div class="bloco-pista"> ✅ <strong>Pista Descoberta (${paresResolvidos.size}/${totalPistasPossiveis}) - ${pistaObj.nome || 'Evidência'}:</strong><br> <em>"${pistaObj.descricao_revelada}"</em> </div>`;

                let msgSucesso = `<strong>📊 Relatório de Interrogatório Atualizado:</strong><br>${pistasDescobertasHtml}`;
                if (todasResolvidas) {
                    msgSucesso += `<br><span style="color: #1b4332; font-weight: bold; margin-top: 12px; display: block;">🔒 Todas as pistas de contradição foram extraídas! Já podes emitir o mandado de prisão.</span>`;
                } else {
                    msgSucesso += `<br><span style="color: #856404; font-weight: bold; margin-top: 12px; display: block;">🔍 Pista desbloqueada! Selecione novos pares para continuar.</span>`;
                }

                finalizarMinijogo(true, todasResolvidas, msgSucesso);
            } else if (acertouLogica && acertouTiming && !confrontoEncontrado.pista_id) {
                divergenciasSemPistaTestadas.add(confrontoEncontrado.id_par);
                const msgDivergencia = confrontoEncontrado.feedback_contradicao || "Há divergência entre os relatos, mas este ponto não revela uma pista nova para a investigação.";
                const historicoAtual = pistasDescobertasHtml
                    ? `<div style="margin-top: 10px;"><strong>📊 Pistas já extraídas:</strong>${pistasDescobertasHtml}</div>`
                    : '';

                emMinijogoAtivo = false;
                barraTiming.classList.remove('ativo');
                painelPoligrafo.classList.remove('modo-teste-ativo');
                estadoOndaEcg = 'normal';
                detalheBox.innerHTML = `<div>ℹ️ <strong>Divergência Sem Pista Nova:</strong> ${msgDivergencia}</div>${historicoAtual}`;
                detalheBox.style.background = '#fef9c3';
                detalheBox.style.borderColor = '#ca8a04';
                statusPoligrafo.textContent = 'ESTADO: 🟡 DIVERGÊNCIA SEM NOVA PISTA';
                statusPoligrafo.style.color = '#ffcc00';
                atualizarTextoBotaoConfronto();
            } else if (!acertouLogica) {
                finalizarMinijogo(false, false, `❌ <strong>Falso Positivo / Sem Contradição:</strong> Estas declarações não se contradizem. A tensão de <strong>${selecaoA.nomeTestemunha}</strong> e <strong>${selecaoB.nomeTestemunha}</strong> aumentou!`);
            } else {
                finalizarMinijogo(false, false, `❌ <strong>Timing Incorreto!</strong> A contradição existe, mas clicaste fora da zona dourada. As testemunhas ficaram mais tensas!`);
            }
        }
    });

    function finalizarMinijogo(sucesso, conclusaoTotal, mensagem) {
        emMinijogoAtivo = false;
        barraTiming.classList.remove('ativo');
        painelPoligrafo.classList.remove('modo-teste-ativo');

        if (sucesso) {
            estadoOndaEcg = 'acerto';
            detalheBox.innerHTML = mensagem;
            detalheBox.style.background = '#d8f3dc';
            detalheBox.style.borderColor = '#2d6a4f';

            if (conclusaoTotal) {
                statusPoligrafo.textContent = 'ESTADO: 🔒 INTERROGATÓRIO CONCLUÍDO';
                statusPoligrafo.style.color = '#ffcc00';
                btnConfrontar.disabled = true;
                btnConfrontar.textContent = '🔒 CASO RESOLVIDO NESTE SETOR';
                btnConfrontar.style.background = '#1b4332';
            } else {
                statusPoligrafo.textContent = 'ESTADO: 🟢 PARCIALMENTE RESOLVIDO';
                statusPoligrafo.style.color = '#ffcc00';
                btnConfrontar.disabled = true;
                btnConfrontar.textContent = '⚡ SELECIONE NOVAS FRASES';
                btnConfrontar.style.background = '#3b2718';

                selecaoA = null;
                selecaoB = null;
                container.querySelectorAll('.frase-confronto').forEach(s => s.classList.remove('selecionada'));
                slotA.innerHTML = `<strong>Versão A:</strong> <em>Nenhuma</em>`;
                slotB.innerHTML = `<strong>Versão B:</strong> <em>Nenhuma</em>`;
            }
        } else {
            estadoOndaEcg = 'erro';
            if (selecaoA) {
                tensaoTestemunhas[selecaoA.testemunhaIdx] = Math.min(3, tensaoTestemunhas[selecaoA.testemunhaIdx] + 1);
                atualizarCartaoTestemunha(selecaoA.testemunhaIdx);
            }
            if (selecaoB && selecaoB.testemunhaIdx !== selecaoA?.testemunhaIdx) {
                tensaoTestemunhas[selecaoB.testemunhaIdx] = Math.min(3, tensaoTestemunhas[selecaoB.testemunhaIdx] + 1);
                atualizarCartaoTestemunha(selecaoB.testemunhaIdx);
            }

            const historicoAtual = pistasDescobertasHtml
                ? `<div style="margin-top: 10px;"><strong>📊 Pistas já extraídas:</strong>${pistasDescobertasHtml}</div>`
                : '';

            detalheBox.innerHTML = `<div>${mensagem}</div>${historicoAtual}`;
            detalheBox.style.background = '#ffccd5';
            detalheBox.style.borderColor = '#800f2f';

            statusPoligrafo.textContent = 'ESTADO: 🟡 TENSÃO ELEVADA NAS ENVOLVIDAS';
            statusPoligrafo.style.color = '#ffcc00';
            atualizarTextoBotaoConfronto();
        }
    }
}

function renderizarLayoutLaboratorio(caso, container) {
    if (typeof window.exibirModalInstrucaoLayout === 'function') {
    window.exibirModalInstrucaoLayout('laboratorio', ehDiario);
  }

    if (window._cleanupLaboratorioLoops) {
        window._cleanupLaboratorioLoops();
        window._cleanupLaboratorioLoops = null;
    }

    container.innerHTML = `
      <div class="carimbo-topo">LABORATÓRIO MÉDICO-LEGAL - PERÍCIA FORENSE</div>
      
      <div class="secao-doc" style="margin-bottom: 12px;">
        <p><strong>Relatório Preliminar:</strong> ${caso.relatorio || 'Abra a gaveta de evidências, selecione uma amostra e opere a estação correspondente na bancada.'}</p>
      </div>

      <div class="lab-bancada-container">
        
        <!-- 📂 GAVETA DE EVIDÊNCIAS -->
        <div class="lab-gaveta-wrapper">
          <div class="gaveta-cabecalho" id="btn-toggle-gaveta">
            <span>📂 GAVETA DE AMOSTRAS COLETADAS (<span id="contador-amostras">0/0</span>)</span>
            <span id="icone-gaveta">▲</span>
          </div>
          <div class="gaveta-conteudo" id="conteudo-gaveta">
            <div class="amostras-grid-lab" id="grid-amostras"></div>
          </div>
        </div>

        <!-- 🎛️ PAINEL DE CONTROLE DAS ESTAÇÕES COM LEDS ANALÓGICOS -->
        <div class="lab-painel-abas">
          <button type="button" class="btn-aba-estacao ativo" data-estacao="reagentes" id="tab-reagentes">
            <span class="led-indicador" id="led-reagentes"></span> 🧪 Reagentes Químicos
          </button>
          <button type="button" class="btn-aba-estacao" data-estacao="ondas" id="tab-ondas">
            <span class="led-indicador" id="led-ondas"></span> 📈 Osciloscópio
          </button>
          <button type="button" class="btn-aba-estacao" data-estacao="matriz" id="tab-matriz">
            <span class="led-indicador" id="led-matriz"></span> 🔗 Matriz Biométrica
          </button>
        </div>

        <!-- 🧪 ESTAÇÃO 1: REAGENTES QUÍMICOS (TUBOS DE ENSAIO + PROTOCOLO) -->
        <div class="estacao-ambiente" id="ambiente-reagentes">
          <div class="ambiente-titulo">ESTATIVA DE REAÇÃO QUÍMICA - TUBOS GRADUADOS</div>
          
          <div style="background: rgba(255, 248, 238, 0.08); border: 1px solid #5a3d28; border-radius: 4px; padding: 8px; margin-bottom: 10px; text-align: left; font-size: 0.75rem; color: #dcd0b8;">
            <strong style="color: #ffcc00;">📋 PROTOCOLO DE NEUTRALIZAÇÃO FORENSE:</strong>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              <li><strong>Ácido Forte:</strong> Dissolve amostras alcalinas ou minerais rígidos.</li>
              <li><strong>Base Fria:</strong> Neutraliza compostos ácidos (pH &lt; 7) e termossensíveis sem destruir estruturas biológicas.</li>
              <li><strong>Solvente Volátil:</strong> Dilui óleos pesados, resinas e substâncias apolares.</li>
            </ul>
          </div>
          
          <div class="tubo-reacao-container">
            <div class="tubo-ensaio-principal" id="tubo-principal">
              <div class="graduacao-vidro"></div>
              <div class="liquido-tubo" id="liquido-reacao">
                <div class="bolhas-container" id="bolhas-reacao"></div>
              </div>
            </div>
            <span class="etiqueta-tubo" id="label-amostra-quimica">NENHUMA AMOSTRA CONECTADA</span>
          </div>

          <div class="frascos-laboratorio-grid">
            <div class="frasco-item" data-reagente="acido_forte">
              <div class="frasco-vidro acido"></div>
              <span>Ácido Forte</span>
            </div>
            <div class="frasco-item" data-reagente="base_fria">
              <div class="frasco-vidro base"></div>
              <span>Base Fria</span>
            </div>
            <div class="frasco-item" data-reagente="solventes">
              <div class="frasco-vidro solvente"></div>
              <span>Solvente Volátil</span>
            </div>
          </div>
        </div>

        <!-- 📈 ESTAÇÃO 2: ONDAS E FREQUÊNCIAS (OSCILOSCÓPIO POR RESSONÂNCIA) -->
        <div class="estacao-ambiente oculto" id="ambiente-ondas">
          <div class="ambiente-titulo">MONITOR DE RESSONÂNCIA E FREQUÊNCIA</div>
          <p class="ambiente-desc">Consulte a faixa de frequência no laudo da amostra e gire o dial até eliminar o ruído estático da onda.</p>
          
          <div class="osciloscopio-visor-box">
            <canvas id="canvas-osciloscopio" width="380" height="90"></canvas>
            <div class="osciloscopio-hud">
              <span id="status-onda-hud">SINAL: AGUARDANDO AMOSTRA</span>
              <span class="frequencia-digital-display" id="display-freq">10 Hz</span>
            </div>
          </div>

          <div class="controles-frequencia-box">
            <button type="button" class="btn-ajuste-fino" data-delta="-5">-5 Hz</button>
            <button type="button" class="btn-ajuste-fino" data-delta="-1">-1 Hz</button>
            
            <div class="dial-rotativo" id="dial-btn" title="Clique para girar +5 Hz">
              <div class="dial-ponteiro"></div>
            </div>

            <button type="button" class="btn-ajuste-fino" data-delta="1">+1 Hz</button>
            <button type="button" class="btn-ajuste-fino" data-delta="5">+5 Hz</button>
          </div>

          <button type="button" class="btn-acao-lab" id="btn-sintonizar" style="margin-top: 12px;">⚡ TRAVAR RESSONÂNCIA DE ONDA</button>
        </div>

        <!-- 🔗 ESTAÇÃO 3: MATRIZ BIOMÉTRICA (CRUZAMENTO FINAL) -->
        <div class="estacao-ambiente oculto" id="ambiente-matriz">
          <div class="ambiente-titulo">MATRIZ BIOMÉTRICA - ASSINATURA MATERIAL</div>
          <p class="ambiente-desc">Cruze os perfis isolados nas estações anteriores para emitir o perfil biológico e físico do suspeito.</p>
          
          <div class="slots-matriz-grid" id="slots-matriz"></div>

          <button type="button" class="btn-acao-lab" id="btn-gerar-chave" disabled style="margin-top: 12px;">🔒 GERAR ASSINATURA MATERIAL DEFINITIVA</button>
        </div>

        <!-- 📋 TERMINAL DE LAUDO E FEEDBACK FORENSE -->
        <div class="painel-laudo-estilizado estado-neutro" id="detalhe-laboratorio">
          <em>💡 <strong>Bancada Inicializada:</strong> Selecione uma amostra na gaveta acima para acender a estação correspondente.</em>
        </div>

      </div>

      <!-- 📜 PROVAS MATERIAIS ISOLADAS E DEPOIMENTOS DO CASO -->
      <div class="secao-doc" style="margin-top: 14px;">
        <h3>Provas Materiais Isoladas (Dossiê)</h3>
        <ul id="lista-provas-lab" class="lista-pistas">
          <li id="aviso-sem-prova-lab">Nenhuma assinatura material consolidada até o momento.</li>
        </ul>
      </div>

      <div class="secao-doc">
        <h3>Laudos e Depoimentos Anexos</h3>
        <div id="lista-depoimentos-lab"></div>
      </div>
    `;

    const amostras = caso.amostras_laboratorio || [];
    const pistasGlobais = caso.pistas || [];
    const depoimentos = caso.depoimentos || [];

    let amostraAtiva = null;
    let analisesIsoladas = new Map();
    let matrizConcluida = false;
    let frequenciaAtual = 10;
    let grauRotacaoDial = 0;
    let animacaoOndaId = null;
    let faseOnda = 0;
    let layoutAtivo = true;

    const btnToggleGaveta = container.querySelector('#btn-toggle-gaveta');
    const conteudoGaveta = container.querySelector('#conteudo-gaveta');
    const iconeGaveta = container.querySelector('#icone-gaveta');
    const gridAmostras = container.querySelector('#grid-amostras');
    const contadorAmostras = container.querySelector('#contador-amostras');
    const detalheLaboratorio = container.querySelector('#detalhe-laboratorio');

    const botoesAbas = container.querySelectorAll('.btn-aba-estacao');
    const ambientes = {
        reagentes: container.querySelector('#ambiente-reagentes'),
        ondas: container.querySelector('#ambiente-ondas'),
        matriz: container.querySelector('#ambiente-matriz')
    };
    const leds = {
        reagentes: container.querySelector('#led-reagentes'),
        ondas: container.querySelector('#led-ondas'),
        matriz: container.querySelector('#led-matriz')
    };

    const tuboPrincipal = container.querySelector('#tubo-principal');
    const liquidoReacao = container.querySelector('#liquido-reacao');
    const bolhasReacao = container.querySelector('#bolhas-reacao');
    const labelAmostraQuimica = container.querySelector('#label-amostra-quimica');

    const canvasOnda = container.querySelector('#canvas-osciloscopio');
    const ctxOnda = canvasOnda.getContext('2d');
    const displayFreq = container.querySelector('#display-freq');
    const statusOndaHud = container.querySelector('#status-onda-hud');
    const dialBtn = container.querySelector('#dial-btn');
    const btnSintonizar = container.querySelector('#btn-sintonizar');

    const slotsMatriz = container.querySelector('#slots-matriz');
    const btnGerarChave = container.querySelector('#btn-gerar-chave');
    const listaProvasLab = container.querySelector('#lista-provas-lab');
    const avisoSemProvaLab = container.querySelector('#aviso-sem-prova-lab');

    window._cleanupLaboratorioLoops = () => {
        layoutAtivo = false;
        if (animacaoOndaId) {
            cancelAnimationFrame(animacaoOndaId);
            animacaoOndaId = null;
        }
    };

    function normalizarEstacao(tipo) {
        if (tipo === 'quimica' || tipo === 'reagentes') return 'reagentes';
        if (tipo === 'fisica' || tipo === 'ondas') return 'ondas';
        return 'reagentes';
    }

    function formatarNomeReagente(chave) {
        const mapa = {
            acido_forte: 'Ácido Forte',
            base_fria: 'Base Fria',
            solventes: 'Solvente Volátil'
        };
        return mapa[chave] || (chave || '').replace(/_/g, ' ');
    }

    function atualizarFeedback(html, tipo = 'neutro') {
        detalheLaboratorio.innerHTML = html;
        detalheLaboratorio.className = `painel-laudo-estilizado estado-${tipo}`;

        if (tipo === 'erro') {
            detalheLaboratorio.style.background = '#3b1216';
            detalheLaboratorio.style.borderColor = '#ef4444';
            detalheLaboratorio.style.color = '#fde8e8';
        } else if (tipo === 'sucesso') {
            detalheLaboratorio.style.background = '#122b1d';
            detalheLaboratorio.style.borderColor = '#22c55e';
            detalheLaboratorio.style.color = '#dcfce7';
        } else if (tipo === 'info') {
            detalheLaboratorio.style.background = '#17253b';
            detalheLaboratorio.style.borderColor = '#38bdf8';
            detalheLaboratorio.style.color = '#e0f2fe';
        } else {
            detalheLaboratorio.style.background = '';
            detalheLaboratorio.style.borderColor = '';
            detalheLaboratorio.style.color = '';
        }
    }

    function renderizarGaveta() {
        contadorAmostras.textContent = `${analisesIsoladas.size}/${amostras.length}`;
        gridAmostras.innerHTML = '';

        amostras.forEach(am => {
            const isolada = analisesIsoladas.has(am.id_amostra);
            const ativa = amostraAtiva && amostraAtiva.id_amostra === am.id_amostra;
            const estacaoAlvo = normalizarEstacao(am.tipo_estacao);

            const cartao = document.createElement('div');
            cartao.className = `cartao-amostra-gaveta ${isolada ? 'isolada' : ''} ${ativa ? 'selecionada' : ''}`;
            cartao.innerHTML = `
                <div class="amostra-topo">
                    <strong>🏷️ ${am.nome}</strong>
                    <span class="badge-amostra ${isolada ? 'ok' : 'pendente'}">${isolada ? 'ISOLADA' : 'PENDENTE'}</span>
                </div>
                <p class="amostra-desc">${am.descricao}</p>
                <button type="button" class="btn-selecionar-amostra" data-id="${am.id_amostra}">
                    ${isolada ? '✅ REVISAR NA BANCADA' : (estacaoAlvo === 'reagentes' ? '🧪 ENVIAR P/ REAGENTES' : '📈 ENVIAR P/ OSCILOSCÓPIO')}
                </button>
            `;
            gridAmostras.appendChild(cartao);
        });

        container.querySelectorAll('.btn-selecionar-amostra').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selecionarAmostra(e.target.getAttribute('data-id'));
            });
        });
    }

    function selecionarAmostra(id) {
        const am = amostras.find(a => a.id_amostra === id);
        if (!am) return;

        amostraAtiva = am;
        const estacaoAlvo = normalizarEstacao(am.tipo_estacao);

        Object.values(leds).forEach(led => led.classList.remove('aceso'));
        if (leds[estacaoAlvo]) leds[estacaoAlvo].classList.add('aceso');

        if (estacaoAlvo === 'reagentes') {
            labelAmostraQuimica.textContent = `AMOSTRA: ${am.nome.toUpperCase()}`;
            liquidoReacao.className = 'liquido-tubo preenchido';
            if (analisesIsoladas.has(am.id_amostra)) {
                liquidoReacao.classList.add('reacao-sucesso');
            }
        } else if (estacaoAlvo === 'ondas') {
            statusOndaHud.textContent = `ALVO: ${am.nome.toUpperCase()}`;
        }

        alternarAba(estacaoAlvo);
        renderizarGaveta();

        atualizarFeedback(`🔬 <strong>Amostra Carregada:</strong> <em>${am.nome}</em> (${am.descricao}). Opere a estação acesa.`, 'info');
    }

    function alternarAba(estacao) {
        botoesAbas.forEach(b => {
            b.classList.toggle('ativo', b.getAttribute('data-estacao') === estacao);
        });

        Object.keys(ambientes).forEach(key => {
            ambientes[key].classList.toggle('oculto', key !== estacao);
        });

        if (estacao === 'ondas' && layoutAtivo) {
            iniciarAnimacaoOsciloscopio();
        } else if (animacaoOndaId) {
            cancelAnimationFrame(animacaoOndaId);
            animacaoOndaId = null;
        }
    }

    botoesAbas.forEach(aba => {
        aba.addEventListener('click', () => alternarAba(aba.getAttribute('data-estacao')));
    });

    btnToggleGaveta.addEventListener('click', () => {
        conteudoGaveta.classList.toggle('oculto');
        iconeGaveta.textContent = conteudoGaveta.classList.contains('oculto') ? '▼' : '▲';
    });

    function dispararBolhas() {
        bolhasReacao.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const b = document.createElement('span');
            b.className = 'bolha-quimica';
            b.style.left = `${15 + Math.random() * 70}%`;
            b.style.animationDelay = `${Math.random() * 0.6}s`;
            bolhasReacao.appendChild(b);
        }
    }

    container.querySelectorAll('.frasco-item').forEach(frasco => {
        frasco.addEventListener('click', () => {
            if (!amostraAtiva || normalizarEstacao(amostraAtiva.tipo_estacao) !== 'reagentes') {
                atualizarFeedback(`⚠️ <strong>Bancada Vazia:</strong> Selecione uma amostra química na gaveta antes de pingar reagentes.`, 'erro');
                return;
            }

            const escolha = frasco.getAttribute('data-reagente');
            dispararBolhas();

            if (escolha === amostraAtiva.reagente_correto) {
                liquidoReacao.className = 'liquido-tubo preenchido reacao-sucesso';
                const detalheReacao = amostraAtiva.resultado_quimico || `Reação controlada com ${formatarNomeReagente(escolha)}; composto estabilizado para análise.`;
                concluirIsolamentoEstacao(amostraAtiva, detalheReacao);
            } else {
                liquidoReacao.className = 'liquido-tubo preenchido reacao-falha';
                tuboPrincipal.classList.add('tremor-vidro');
                setTimeout(() => {
                    tuboPrincipal.classList.remove('tremor-vidro');
                    liquidoReacao.className = 'liquido-tubo preenchido';
                }, 700);

                atualizarFeedback(`❌ <strong>Reação Incompatível:</strong> Consulte o <em>Protocolo de Neutralização Forense</em> na bancada e compare com as propriedades da amostra (${amostraAtiva.descricao}).`, 'erro');
            }
        });
    });

    function ajustarFrequencia(delta) {
        frequenciaAtual = Math.max(5, Math.min(95, frequenciaAtual + delta));
        grauRotacaoDial = (grauRotacaoDial + delta * 6) % 360;
        dialBtn.style.transform = `rotate(${grauRotacaoDial}deg)`;
        displayFreq.textContent = `${frequenciaAtual} Hz`;
    }

    container.querySelectorAll('.btn-ajuste-fino').forEach(btn => {
        btn.addEventListener('click', () => {
            ajustarFrequencia(parseInt(btn.getAttribute('data-delta'), 10));
        });
    });

    dialBtn.addEventListener('click', () => ajustarFrequencia(5));

    function iniciarAnimacaoOsciloscopio() {
        if (animacaoOndaId) cancelAnimationFrame(animacaoOndaId);

        function desenhar() {
            if (!layoutAtivo) return;
            const w = canvasOnda.width;
            const h = canvasOnda.height;
            ctxOnda.clearRect(0, 0, w, h);

            ctxOnda.strokeStyle = 'rgba(217, 119, 6, 0.15)';
            ctxOnda.lineWidth = 1;
            for (let x = 0; x < w; x += 38) {
                ctxOnda.beginPath(); ctxOnda.moveTo(x, 0); ctxOnda.lineTo(x, h); ctxOnda.stroke();
            }
            for (let y = 0; y < h; y += 30) {
                ctxOnda.beginPath(); ctxOnda.moveTo(0, y); ctxOnda.lineTo(w, y); ctxOnda.stroke();
            }

            const temAmostraOnda = amostraAtiva && normalizarEstacao(amostraAtiva.tipo_estacao) === 'ondas';
            const freqAlvo = temAmostraOnda ? (amostraAtiva.frequencia_correta || 45) : 45;
            const diferenca = Math.abs(frequenciaAtual - freqAlvo);
            const sintonizado = temAmostraOnda && diferenca === 0;
            const proximo = temAmostraOnda && diferenca <= 5;

            ctxOnda.strokeStyle = sintonizado ? '#00ff66' : (proximo ? '#fbbf24' : '#ef4444');
            ctxOnda.shadowColor = ctxOnda.strokeStyle;
            ctxOnda.shadowBlur = sintonizado ? 12 : 4;
            ctxOnda.lineWidth = 2.5;
            ctxOnda.beginPath();
            for (let x = 0; x < w; x++) {
                const ruido = temAmostraOnda ? (Math.sin(x * 0.45 + faseOnda * 4) * Math.min(diferenca * 0.65, 18)) : 2;
                const y = (h / 2) + Math.sin((x * frequenciaAtual * 0.004) + faseOnda) * 24 + ruido;
                x === 0 ? ctxOnda.moveTo(x, y) : ctxOnda.lineTo(x, y);
            }
            ctxOnda.stroke();
            ctxOnda.shadowBlur = 0;

            if (temAmostraOnda) {
                statusOndaHud.textContent = sintonizado
                    ? `SINAL: 🟢 RESSONÂNCIA ESTÁVEL (0% RUÍDO)`
                    : (proximo ? `SINAL: 🟡 INTERFERÊNCIA BAIXA` : `SINAL: 🔴 ALTA ESTÁTICA`);
            }

            faseOnda += 0.08;
            animacaoOndaId = requestAnimationFrame(desenhar);
        }
        desenhar();
    }

    btnSintonizar.addEventListener('click', () => {
        if (!amostraAtiva || normalizarEstacao(amostraAtiva.tipo_estacao) !== 'ondas') {
            atualizarFeedback(`⚠️ <strong>Sem Sinal de Entrada:</strong> Selecione a amostra acústica ou vibracional na gaveta primeiro.`, 'erro');
            return;
        }

        const alvo = amostraAtiva.frequencia_correta || 45;
        if (frequenciaAtual === alvo) {
            const detalheOnda = amostraAtiva.resultado_fisico || `Ressonância estabilizada em ${alvo} Hz com sinal limpo.`;
            concluirIsolamentoEstacao(amostraAtiva, detalheOnda);
        } else {
            const dica = Math.abs(frequenciaAtual - alvo) <= 5
                ? 'O sinal já está próximo (amarelo)! Use os botões -1 Hz / +1 Hz para eliminar o ruído restante.'
                : `Ajuste o dial dentro da faixa indicada no laudo (${amostraAtiva.descricao}) até a onda ficar verde e sem chuvisco.`;
            atualizarFeedback(`❌ <strong>Sinal com Estática (${frequenciaAtual} Hz):</strong> ${dica}`, 'erro');
        }
    });

    function concluirIsolamentoEstacao(amostra, detalheTecnico) {
        analisesIsoladas.set(amostra.id_amostra, {
            amostra,
            detalheTecnico
        });

        renderizarGaveta();
        atualizarMatrizBiometrica();

        const todasProntas = analisesIsoladas.size === amostras.length;

        if (todasProntas) {
            leds.reagentes.classList.remove('aceso');
            leds.ondas.classList.remove('aceso');
            leds.matriz.classList.add('aceso');

            atualizarFeedback(`✅ <strong>AMOSTRA ISOLADA (${analisesIsoladas.size}/${amostras.length}):</strong> ${detalheTecnico}<br> <span style="color: #ffcc00; font-weight: bold; display: block; margin-top: 6px;">🔗 Todas as análises parciais foram concluídas! Acesse a aba "Matriz Biométrica" para cruzar os dados e gerar o Perfil do Suspeito.</span>`, 'sucesso');
        } else {
            atualizarFeedback(`✅ <strong>AMOSTRA ISOLADA (${analisesIsoladas.size}/${amostras.length}):</strong> ${detalheTecnico}<br> <span style="color: #f4ebd9; display: block; margin-top: 6px;">📂 Abra a gaveta e selecione a próxima amostra pendente.</span>`, 'sucesso');
        }
    }

    function atualizarMatrizBiometrica() {
        slotsMatriz.innerHTML = '';
        amostras.forEach((am, idx) => {
            const dados = analisesIsoladas.get(am.id_amostra);
            const slot = document.createElement('div');
            slot.className = `slot-matriz-item ${dados ? 'preenchido' : 'vazio'}`;
            slot.innerHTML = dados
                ? `<strong>PARÂMETRO 0${idx + 1} (${am.nome}):</strong><br><span>✅ ${dados.detalheTecnico}</span>`
                : `<strong>PARÂMETRO 0${idx + 1} (${am.nome}):</strong><br><em>⏳ Aguardando isolamento na bancada...</em>`;
            slotsMatriz.appendChild(slot);
        });

        if (analisesIsoladas.size === amostras.length && amostras.length > 0 && !matrizConcluida) {
            btnGerarChave.disabled = false;
            btnGerarChave.textContent = '🔓 CRUZAR DADOS E GERAR ASSINATURA DEFINITIVA';
        }
    }

    btnGerarChave.addEventListener('click', () => {
        if (matrizConcluida) return;
        matrizConcluida = true;
        btnGerarChave.disabled = true;
        btnGerarChave.textContent = '🔒 ASSINATURA MATERIAL EMITIDA';
        leds.matriz.classList.remove('aceso');

        if (avisoSemProvaLab) avisoSemProvaLab.remove();

        const itensParametrosHtml = Array.from(analisesIsoladas.values())
            .map(item => `
                <li style="margin-bottom: 4px;">
                    <strong>${item.amostra.nome}:</strong> ${item.detalheTecnico}
                </li>
            `)
            .join('');

        const pistasParaExibir = pistasGlobais.length > 0
            ? pistasGlobais
            : [{
                nome: 'Assinatura Material Consolidada',
                descricao_revelada: 'Parâmetros laboratoriais cruzados com sucesso.'
            }];

        pistasParaExibir.forEach(pista => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>[PROVA MASTER] ${pista.nome}:</strong> ${pista.descricao_revelada}`;
            listaProvasLab.appendChild(li);
        });

        const textoAssinatura = caso.assinatura_material || pistasParaExibir[0].descricao_revelada;

        atualizarFeedback(`
            <div style="display: flex; flex-direction: column; gap: 8px; text-align: left; line-height: 1.45;">
                <div style="font-weight: bold; color: #86efac; letter-spacing: 0.4px;">
                    🏆 ASSINATURA MATERIAL CONSOLIDADA
                </div>
                <ul style="margin: 0; padding-left: 18px; color: #dcfce7; font-size: 0.85rem;">
                    ${itensParametrosHtml}
                </ul>
                <div style="padding-top: 6px; border-top: 1px solid rgba(134, 239, 172, 0.25); color: #f0fdf4; font-size: 0.86rem;">
                    <strong>🧬 Parecer da Matriz:</strong> ${textoAssinatura}
                </div>
                <div style="color: #fde047; font-size: 0.82rem; font-weight: 600;">
                    ⚖️ Cruza estas evidências no teu Dossiê e preenche o Mandado de Prisão.
                </div>
            </div>
        `, 'sucesso');
    });

    const listaDepoimentosLab = container.querySelector('#lista-depoimentos-lab');
    if (listaDepoimentosLab && depoimentos.length > 0) {
        listaDepoimentosLab.innerHTML = '';
        depoimentos.forEach(dep => {
            const div = document.createElement('div');
            div.className = 'cartao-depoimento-lab';
            div.innerHTML = `<p><strong>${dep.testemunha || 'Perito'}:</strong> "${dep.texto}"</p>`;
            listaDepoimentosLab.appendChild(div);
        });
    } else if (listaDepoimentosLab) {
        listaDepoimentosLab.innerHTML = 'Nenhum laudo auxiliar registrado.';
    }

    renderizarGaveta();
    atualizarMatrizBiometrica();
}