window.exibirModalInstrucaoLayout = function(tipoLayout, forcarExibicao = false) {
    let chaveNormalizada = (tipoLayout || 'padrao').toLowerCase().trim();
    if (chaveNormalizada === 'laboratorio_medico') chaveNormalizada = 'laboratorio';

    const chaveSessao = `manual_visto_${chaveNormalizada}`;

    if (!forcarExibicao && sessionStorage.getItem(chaveSessao)) return;

    const antigos = document.querySelectorAll('.pasta-overlay-instrucao');
    antigos.forEach(el => el.remove());

    const conteudosManuais = {
        jogo: {
            pastaNome: "DIRETRIZ GERAL — DEPARTAMENTO",
            titulo: "COMO FUNCIONA A INVESTIGAÇÃO",
            passos: [
                "Cada caso começa com um saldo de <strong>Horas de Perícia</strong>: investigar pistas, analisar amostras ou errar consome tempo do relógio.",
                "Cruze os indícios da cena com os depoimentos para deduzir qual Pokémon está por trás da ocorrência.",
                "Sobrar mais horas e errar menos aumenta sua <strong>Pontuação</strong> e seu <strong>Rank</strong> ao fechar o caso.",
                "Quando tiver certeza do culpado, emita o <strong>Mandado de Prisão</strong> para encerrar a investigação."
            ]
        },
        padrao: {
            pastaNome: "MANUAL DE INVESTIGAÇÃO — GERAL",
            titulo: "PROTOCOLO DE INQUÉRITO PADRÃO",
            passos: [
                "Analise o relatório oficial do caso e os depoimentos anexados para entender a cronologia dos fatos.",
                "Avalie as pistas disponíveis e filtre informações relevantes para deduzir o suspeito.",
                "Ao identificar o Pokémon culpado, preencha o Mandado de Prisão com precisão."
            ]
        },
        laboratorio: {
            pastaNome: "MANUAL DE INVESTIGAÇÃO — LABORATÓRIO",
            titulo: "PROTOCOLO DE BANCADA FORENSE",
            passos: [
                "Abra a <strong>Gaveta de Amostras</strong> e envie todos os vestígios disponíveis (que aumentam nos ranks mais altos) para a bancada.",
                "Na <strong>Estativa de Reagentes</strong>, compare o pH da amostra com a tabela; no <strong>Osciloscópio</strong>, ajuste o dial até eliminar o ruído da onda.",
                "Analise cada amostra com atenção e conclua a <strong>Matriz Biométrica</strong> para consolidar as descobertas."
            ]
        },
        planta_baixa: {
            pastaNome: "MANUAL DE INVESTIGAÇÃO — PERÍCIA DE CAMPO",
            titulo: "MANUAL DO PINCEL ESPECTRAL",
            passos: [
                "Alterne entre as lentes <strong>Térmica 🔴</strong>, <strong>UV 🟣</strong> e <strong>Impacto 🟡</strong> para varrer os pontos do mapa e observar o <strong>Indicador de Sinal (%)</strong>.",
                "Mantenha o pincel sobre o alvo até completar o anel e leia a descrição completa de cada vestígio coletado.",
                "No <strong>Painel de Correlação</strong>, cruze indícios (muitas vezes de lentes diferentes) que tratem do mesmo aspecto do caso; nem todo par gera conclusão."
            ]
        },
        documento_secreto: {
            pastaNome: "MANUAL DE INVESTIGAÇÃO — CRIPTOGRAFIA",
            titulo: "TERMINAL POLYSPHERE 3D",
            passos: [
                "Clique nos blocos censurados do relatório para abrir o terminal do setor correspondente.",
                "Escolha a palavra-chave nas <strong>opções de giro</strong> e arraste os estilhaços no espaço 3D até alinhá-los antes de consolidar.",
                "Reúna todas as chaves no decodificador para liberar o <strong>Anexo Ultrassecreto</strong>."
            ]
        },
        interrogatorio_confronto: {
            pastaNome: "MANUAL DE INVESTIGAÇÃO — POLÍGRAFO",
            titulo: "PROCEDIMENTO DE CONFRONTO",
            passos: [
                "Leia o depoimento de cada testemunha e selecione duas frases que apresentem contradição entre si.",
                "Acione o polígrafo na <strong>zona dourada</strong> para validar o choque entre os relatos.",
                "Atenção: há mais contradições nos casos avançados, mas nem toda contradição resulta em uma pista nova."
            ]
        }
    };

    const dados = conteudosManuais[chaveNormalizada] || conteudosManuais.padrao;

    const overlay = document.createElement('div');
    overlay.className = 'pasta-overlay-instrucao';

    const htmlPassos = dados.passos.map(p => `<li>${p}</li>`).join('');

    overlay.innerHTML = `
        <div class="pasta-interativa-wrapper">
            <div class="pasta-capa-tras">
                <div class="pasta-orelha">📁 ${dados.pastaNome}</div>

                <div class="folha-puxavel" id="folha-manual-interativa">
                    <div class="alca-puxar-folha">CLIQUE AQUI PARA PUXAR A FOLHA DA PASTA</div>

                    <div class="conteudo-interno-folha">
                        <h3>${dados.titulo}</h3>
                        <ul>${htmlPassos}</ul>
                        <button type="button" id="btn-guardar-folha" class="btn-guardar-folha">📂 GUARDAR NA PASTA E INICIAR</button>
                    </div>
                </div>

                <div class="pasta-bolso-frente">
                    ARQUIVO CONFIDENCIAL • DEPARTAMENTO DE POLÍCIA CIENTÍFICA
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const folhaEl = overlay.querySelector('#folha-manual-interativa');
    const btnGuardar = overlay.querySelector('#btn-guardar-folha');

    folhaEl.addEventListener('click', () => {
        if (!folhaEl.classList.contains('aberta')) {
            folhaEl.classList.add('aberta');
        }
    });

    btnGuardar.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionStorage.setItem(chaveSessao, 'true');
        overlay.remove();
    });
};