export const LEGAL_CASE_STATUS_DETAILS = {
  initial_analysis: { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
  contra_indicated: { name: 'Contraindicado', color: '#64748B', textColor: '#FFFFFF' },
  proposal_sent: { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
  in_negotiation: { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' },
  awaiting_draft: { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
  closed_deal: { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
  failed_deal: { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
};

export const TERMINAL_LEGAL_CASE_STATUSES = [
  'contra_indicated',
  'closed_deal',
  'failed_deal',
];

export const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';

export const LEGAL_CASE_STATUS_ORDER = [
  'initial_analysis',
  'contra_indicated',
  'proposal_sent',
  'in_negotiation',
  'awaiting_draft',
  'closed_deal',
  'failed_deal',
];

export const LEGAL_CASE_STATUS_OPTIONS = LEGAL_CASE_STATUS_ORDER.map((statusKey) => ({
  value: statusKey,
  ...LEGAL_CASE_STATUS_DETAILS[statusKey],
}));

export const isTerminalLegalCaseStatus = (status) =>
  TERMINAL_LEGAL_CASE_STATUSES.includes(status);

const humanizeStatus = (status) =>
  String(status ?? 'Status desconhecido')
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

export const getLegalCaseStatusDetails = (status) =>
  LEGAL_CASE_STATUS_DETAILS[status] || {
    name: humanizeStatus(status),
    color: '#A0AEC0',
    textColor: '#1A202C',
  };
