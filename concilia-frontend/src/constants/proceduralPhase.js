export const PROCEDURAL_PHASE_OPTIONS = [
    { value: 'inicial', label: 'Fase Inicial' },
    { value: 'sentenca', label: 'Sentença' },
    { value: 'recurso', label: 'Recurso' },
    { value: 'cumprimento', label: 'Cumprimento de Sentença' },
];

const PHASE_DETAILS = {
    inicial: { label: 'Fase Inicial', color: '#1d4ed8', background: '#dbeafe' },
    sentenca: { label: 'Sentença', color: '#92400e', background: '#fef3c7' },
    recurso: { label: 'Recurso', color: '#6b21a8', background: '#f3e8ff' },
    cumprimento: { label: 'Cumprimento de Sentença', color: '#065f46', background: '#d1fae5' },
};

export const getProceduralPhaseDetails = (value) => PHASE_DETAILS[value] || null;

export const getProceduralPhaseLabel = (value) => PHASE_DETAILS[value]?.label || '';
