// Fases processuais da planilha semanal do banco (coluna TX_EST_PRC).
// Os valores precisam bater com LegalCase::PROCEDURAL_PHASES no backend.
export const PROCEDURAL_PHASES = [
    { value: 'Inicial', label: 'Inicial', color: '#3B82F6' },
    { value: 'Sentença', label: 'Sentença', color: '#D97706' },
    { value: 'Recurso', label: 'Recurso', color: '#8B5CF6' },
    { value: 'Cumprimento', label: 'Cumprimento', color: '#EF4444' },
];

export const NO_PROCEDURAL_PHASE_VALUE = 'sem_fase';

export const PROCEDURAL_PHASE_FILTER_OPTIONS = [
    ...PROCEDURAL_PHASES.map(({ value, label }) => ({ value, label })),
    { value: NO_PROCEDURAL_PHASE_VALUE, label: 'Sem fase informada' },
];

export const getProceduralPhaseDetails = (phase) =>
    PROCEDURAL_PHASES.find((item) => item.value === phase) || null;

export const getProceduralPhaseFilterLabel = (value) =>
    PROCEDURAL_PHASE_FILTER_OPTIONS.find((option) => option.value === value)?.label || value;
