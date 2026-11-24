# 🕵️‍♂️ Detetive Pokédex — Entrega N2

> Evolução do projeto **Detetive Pokédex** para a disciplina de **Programação Web**, mantendo a arquitetura em **Node.js**, **Express**, **MongoDB (Mongoose)** e **HTML5, CSS3 e JavaScript puro**, com novos layouts, mecânicas de investigação, pontuação e integração externa.

---

## 📌 Visão Geral do Projeto
O **Detetive Pokédex** coloca o jogador para investigar ocorrências, analisar indícios, depoimentos, amostras e cenários dentro de um limite de **Horas de Perícia**, deduzir o Pokémon culpado e emitir o **Mandado de Prisão**.

Após a base da **N1** (4 casos com layout padrão, conexão MongoDB, schemas, seeder, rotas e fluxo inicial de investigação e conclusão), a **N2** expandiu o sistema com as funcionalidades abaixo.

---

## ✨ O Que Foi Adicionado na N2

* 🧩 **4 Novos Layouts de Investigação (`Caso.js` e `investigacao.js`)**
  * 🗺️ **`planta_baixa`** — Perícia de campo com lentes (`termico`, `uv`, `impacto`), varredura de sinal e painel de correlação.
  * 🔐 **`documento_secreto`** — Análise criptográfica com blocos censurados, opções de giro, alinhamento e liberação de anexo ultrassecreto.
  * 💬 **`interrogatorio_confronto`** — Depoimentos divididos em frases para identificar contradições e confrontos.
  * 🧪 **`laboratorio` / `laboratorio_medico`** — Bancada de análise de amostras (`amostras_laboratorio`) e estações forenses.
* ⏱️ **Sistema de Horas de Perícia e Bloqueio (`investigacao.js`)**
  * Gerencia `horasIniciais` e `horasRestantes` com atualização visual no relógio (`#relogio-pericia`), alertas de tempo baixo e bloqueio de novas ações ao chegar a `0h` (com limpeza de loops/listeners ativos e banner de aviso).
* 📂 **Modais de Instrução Interativos (`manualModal.js`)**
  * Modal em formato de pasta com folha puxável (`window.exibirModalInstrucaoLayout`), instruções para o jogo e para cada layout, controle por sessão via `sessionStorage` (`manual_visto_...`) e botão para reabrir.
* 📅 **Sorteio Determinístico do Caso Diário (`casoController.js`)**
  * Função `resolverCasoDoDia` que calcula o caso do dia a partir da data no fuso `'America/Fortaleza'` (`en-CA`), mantendo o mesmo caso durante o dia e mudando na virada.
* 🏆 **Pontuação, Rank, Progresso e Próximo Caso (`casoController.js` e `Progresso.js`)**
  * Calcula pontuação base por rank do caso (`D: 400` até `S: 1300`), bônus proporcional às horas restantes (com redução quando as horas acabam) e rank final (`S` a `D`, ou `F` na falha).
  * Atualiza `Progresso` (`pontuacao_total`, casos resolvidos/arquivados, controle do diário e `historico_casos`) e busca o próximo caso na campanha (`buscarProximoCaso`).
* ⚡ **Autocompletar, Dossiê e PokéAPI (`investigacao.js` e `conclusao.js`)**
  * Cache de Pokémon e autocompletar com sprites na investigação, prévia no modal de dossiê antes de confirmar o mandado e consulta à **PokéAPI** (`/pokemon/...` e `/pokemon-species/...`) na conclusão para mostrar número, imagem/arte oficial, tipos e categoria com fallback em caso de erro.

---

## 🚀 Como Executar

1. 📦 Instale as dependências do projeto:
   ```bash
   npm install
   ```
2. 🔐 Crie um arquivo `.env` na raiz do projeto com a variável `MONGO_URI`.
3. 🌱 Rode o script de seed para popular os casos no MongoDB.
4. ▶️ Inicie o servidor Node.js e abra no navegador (ex.: `http://localhost:3000`).
