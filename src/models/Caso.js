const mongoose = require('mongoose');

const PistaSchema = new mongoose.Schema({
  id_pista: { type: String, required: true },
  nome: { type: String, required: true },
  custo_horas: { type: Number, default: 10 },
  descricao_revelada: { type: String, required: true },
  coordenadas_ou_alvo: { type: String },
  lente: { type: String, enum: ['termico', 'uv', 'impacto'] },
  tipo_pista: { type: String, enum: ['evidencia', 'ruido'], default: 'evidencia' },
  palavra_chave_resposta: { type: String },
  opcoes_giro: [{ type: String }],
  fragmento_evidencia: { type: String },
  dica_contexto: { type: String },
  dica_descriptografia: { type: String }
});

const FraseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  texto: { type: String, required: true }
});

const DepoimentoSchema = new mongoose.Schema({
  testemunha: { type: String },
  papel: { type: String },
  texto: { type: String },
  frases: [FraseSchema]
});

const ConfrontoCorretoSchema = new mongoose.Schema({
  id_par: { type: String, required: true },
  frase_a_id: { type: String, required: true },
  frase_b_id: { type: String, required: true },
  pista_id: { type: String },
  feedback_contradicao: { type: String }
});

const AmostraLaboratorioSchema = new mongoose.Schema({
  id_amostra: { type: String, required: true },
  nome: { type: String, required: true },
  tipo_estacao: { type: String, required: true },
  descricao: { type: String, required: true },
  reagente_correto: { type: String },
  frequencia_correta: { type: Number },
  pista_id_gerada: { type: String, required: true }
});

const CasoSchema = new mongoose.Schema({
  numero_caso: { type: String, required: true, unique: true },
  titulo: { type: String, required: true },
  relatorio: { type: String },
  rank: { type: String, enum: ['D', 'C', 'B', 'A', 'S'], default: 'D' },
  is_daily: { type: Boolean, default: false },
  data_daily: { type: String },
  dificuldade: { type: String, default: 'Fácil' },
  tipo_layout: {
    type: String,
    enum: ['padrao', 'planta_baixa', 'documento_secreto', 'interrogatorio_confronto', 'laboratorio', 'laboratorio_medico'],
    default: 'padrao'
  },
  imagem_mapa: {
    type: String,
    default: ''
  },
  horas_iniciais: { type: Number, default: 100 },
  pokemon_correto: { type: String, required: true },
  dados_pokemon_vitoria: {
    numero_pokedex: { type: Number },
    tipo: [{ type: String }],
    categoria: { type: String }
  },
  amostras_laboratorio: [AmostraLaboratorioSchema],
  pistas: [PistaSchema],
  correlacoes: { type: mongoose.Schema.Types.Mixed, default: {} },
  anexo_ultrassecreto: { type: String },
  depoimentos: [DepoimentoSchema],
  confrontos_corretos: [ConfrontoCorretoSchema]
}, { timestamps: true });

module.exports = mongoose.model('Caso', CasoSchema);