// Reincidência de contraindicação: o backend guarda quantas vezes o caso já foi
// contraindicado e a última contraindicação (motivo, data e autor), mesmo depois
// que o caso volta para a fila.

const formatDateBR = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
};

export const getContraRecurrence = (legalCase) => {
    const count = Number(legalCase?.contra_indication_count || 0);
    if (count <= 0) return null;

    const reason = String(legalCase?.last_contra_indication_reason || '').trim();

    return {
        count,
        reason,
        hasReason: reason !== '' || Boolean(legalCase?.last_contra_indication_reason_id),
        date: formatDateBR(legalCase?.last_contra_indicated_at),
        by: String(legalCase?.last_contra_indicated_by_name || '').trim(),
    };
};

// Caso que voltou para a fila depois de já ter sido contraindicado
export const isRecurrentInQueue = (legalCase) =>
    Boolean(getContraRecurrence(legalCase)) && legalCase?.status !== 'contra_indicated';

// Fila de revisão rápida: casos que voltaram para a análise inicial e foram
// contraindicados há pouco tempo. Ajuste aqui o que conta como "recente".
export const QUICK_REVIEW_WINDOW_DAYS = 90;
export const QUICK_REVIEW_COLUMN = 'quick_review';

export const isInQuickReview = (legalCase, referenceDate = new Date()) => {
    if (legalCase?.status !== 'initial_analysis' || Number(legalCase?.contra_indication_count || 0) <= 0) {
        return false;
    }

    const lastContraAt = new Date(legalCase?.last_contra_indicated_at);
    if (Number.isNaN(lastContraAt.getTime())) {
        return false;
    }

    return (referenceDate - lastContraAt) / (1000 * 60 * 60 * 24) <= QUICK_REVIEW_WINDOW_DAYS;
};

export const CONTRA_RECURRENT_FILTER_OPTIONS = [
    { value: '1', label: 'Já contraindicados antes' },
];

export const formatSkippedCasesMessage = (skipped = [], max = 5) => {
    if (!Array.isArray(skipped) || skipped.length === 0) return '';
    const lines = skipped.slice(0, max).map((item) => `${item.case_number}: ${item.reason}`);
    const rest = skipped.length > max ? `\n… e mais ${skipped.length - max}.` : '';
    return `${skipped.length} ${skipped.length === 1 ? 'processo não foi alterado' : 'processos não foram alterados'}:\n${lines.join('\n')}${rest}`;
};
