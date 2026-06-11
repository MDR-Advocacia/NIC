export const LEGAL_CASE_STATUS_DETAILS = {
  initial_analysis: { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
  indications: { name: 'Indicações', color: '#805AD5', textColor: '#FFFFFF' },
  contra_indicated: { name: 'Contraindicado', color: '#64748B', textColor: '#FFFFFF' },
  proposal_sent: { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
  in_negotiation: { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' },
  awaiting_draft: { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
  closed_deal: { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
  failed_deal: { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
  // Pós-acordo - Audiência
  closed_in_hearing: { name: 'Fechado em Audiência', color: '#2B6CB0', textColor: '#FFFFFF' },
  // Pós-acordo
  pending_payment: { name: 'Pendência de Pagamento', color: '#D69E2E', textColor: '#FFFFFF' },
  pending_obf: { name: 'Pendência de OBF', color: '#DD6B20', textColor: '#FFFFFF' },
  pending_livelo_ourocap: { name: 'Pendência de Livelo/OuroCap', color: '#9F7AEA', textColor: '#FFFFFF' },
  deal_completed: { name: 'Acordo Concluído', color: '#276749', textColor: '#FFFFFF' },
};

export const TERMINAL_LEGAL_CASE_STATUSES = [
  'contra_indicated',
  'closed_deal',
  'failed_deal',
];

// Pipeline Pré-Acordo
export const LEGAL_CASE_STATUS_ORDER = [
  'initial_analysis',
  'indications',
  'contra_indicated',
  'proposal_sent',
  'in_negotiation',
  'awaiting_draft',
  'closed_deal',
  'failed_deal',
];

// Pipeline Pós-Acordo
export const POST_AGREEMENT_STATUS_ORDER = [
  'closed_in_hearing',
  'pending_payment',
  'pending_obf',
  'pending_livelo_ourocap',
  'deal_completed',
];

export const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';

export const ALL_STATUS_ORDER = [...LEGAL_CASE_STATUS_ORDER, ...POST_AGREEMENT_STATUS_ORDER];

export const LEGAL_CASE_STATUS_OPTIONS = ALL_STATUS_ORDER.map((statusKey) => ({
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
