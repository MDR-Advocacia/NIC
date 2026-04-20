import React from 'react';

const booleanToLabel = (value, yesLabel = 'Sim', noLabel = 'Nao') =>
  value ? yesLabel : noLabel;

const getDisplayName = (value, fallback = '-') => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return value.name || value.nome || fallback;
};

const formatCurrencyValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const normalizedNumber = typeof value === 'string'
    ? (() => {
        let numericText = String(value).trim().replace(/[^\d,.-]/g, '');
        if (numericText.includes(',')) {
          numericText = numericText.replace(/\./g, '').replace(',', '.');
        }
        return Number(numericText);
      })()
    : Number(value);

  if (!Number.isFinite(normalizedNumber)) {
    return String(value);
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(normalizedNumber);
};

const obligationToLabel = (value) => {
  const map = {
    simples: 'Simples',
    complexa: 'Complexa',
    apenas_pecuniaria: 'Apenas Pecuniaria',
  };

  return map[value] || value || '-';
};

const SummaryItem = ({ label, meta, value }) => (
  <div
    style={{
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'var(--surface-card-muted)',
      border: '1px solid var(--border-color-light)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
      <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>
      {meta && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{meta}</span>}
    </div>
    <div style={{ marginTop: '8px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
      {value || '-'}
    </div>
  </div>
);

const IndicationChecklistSummary = ({ checklistData }) => {
  const checklist = checklistData?.indication_checklist;

  if (!checklist?.fields) {
    return null;
  }

  const fields = checklist.fields;

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <SummaryItem
        label="Materia"
        meta="Objetivo | Portal BB"
        value={[
          booleanToLabel(fields.materia?.is_valid_for_agreement, 'Apta para acordo', 'Contraindicada'),
          fields.materia?.notes,
        ].filter(Boolean).join('\n')}
      />
      <SummaryItem
        label="Obrigacao"
        meta="Objetivo | Portal BB"
        value={obligationToLabel(fields.obrigacao?.type)}
      />
      <SummaryItem
        label="Subsidio"
        meta="Objetivo | Portal BB"
        value={fields.subsidio?.available === 'sim' ? 'Ha subsidio disponibilizado' : 'Nao ha subsidio disponibilizado'}
      />
      <SummaryItem
        label="Analise do Subsidio"
        meta="Subjetivo | Portal BB"
        value={fields.analise_subsidio?.notes}
      />
      <SummaryItem
        label="Litigante Habitual"
        meta="Objetivo | Portal BB ou L1"
        value={[
          booleanToLabel(fields.litigante_habitual?.has_restriction, 'Com restricao de negociacao', 'Sem restricao de negociacao'),
          fields.litigante_habitual?.notes,
        ].filter(Boolean).join('\n')}
      />
      <SummaryItem
        label="Analise de Risco"
        meta="Objetivo | Portal BB"
        value={fields.analise_risco?.last_analysis_date}
      />
      <SummaryItem
        label="PCOND Portal"
        meta="Objetivo | Portal BB"
        value={fields.pcond_portal?.value}
      />
      <SummaryItem
        label="PCOND Processual"
        meta="Subjetivo | Processo"
        value={fields.pcond_processual?.value}
      />
      <SummaryItem
        label="Alcada"
        meta="Objetivo | Portal BB"
        value={fields.alcada?.formatted_value || formatCurrencyValue(fields.alcada?.value)}
      />
      <SummaryItem
        label="Responsavel pelo Caso"
        meta="Operador"
        value={getDisplayName(checklist.assigned_operator, '-')}
      />
      <SummaryItem
        label="Indicador"
        meta="Auditoria"
        value={[
          getDisplayName(checklist.indicator || checklist.completed_by, '-'),
          checklist.completed_at ? new Date(checklist.completed_at).toLocaleString('pt-BR') : null,
        ].filter(Boolean).join(' em ')}
      />
    </div>
  );
};

export default IndicationChecklistSummary;
