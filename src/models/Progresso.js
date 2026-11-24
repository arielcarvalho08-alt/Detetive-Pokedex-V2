const mongoose = require('mongoose');

const HistoricoCasoSchema = new mongoose.Schema({
  caso_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Caso' },
  numero_caso: { type: String },
  titulo: { type: String },
  rank_caso: { type: String },
  rank_obtido: { type: String },
  pontuacao: { type: Number, default: 0 },
  horas_restantes: { type: Number, default: 0 },
  horas_iniciais: { type: Number, default: 0 },
  acertou: { type: Boolean, default: false },
  data_conclusao: { type: Date, default: Date.now }
}, { _id: false });

const ProgressoSchema = new mongoose.Schema({
  session_id: { type: String, default: "detetive_local" },
  rank_atual: { type: String, default: "D" },
  pontuacao_total: { type: Number, default: 0 },
  casos_resolvidos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Caso' }],
  casos_arquivados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Caso' }],
  historico_casos: [HistoricoCasoSchema],
  daily_concluido_hoje: { type: Boolean, default: false },
  data_ultimo_daily: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Progresso', ProgressoSchema);