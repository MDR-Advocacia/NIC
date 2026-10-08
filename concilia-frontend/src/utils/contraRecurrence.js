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

export const CONTRA_RECURRENT_FILTER_OPTIONS = [
    { value: '1', label: 'Já contraindicados antes' },
];

export const formatSkippedCasesMessage = (skipped = [], max = 5) => {
    if (!Array.isArray(skipped) || skipped.length === 0) return '';
    const lines = skipped.slice(0, max).map((item) => `${item.case_number}: ${item.reason}`);
    const rest = skipped.length > max ? `\n… e mais ${skipped.length - max}.` : '';
    return `${skipped.length} ${skipped.length === 1 ? 'processo não foi alterado' : 'processos não foram alterados'}:\n${lines.join('\n')}${rest}`;
};
