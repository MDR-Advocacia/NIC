export const SETTLEMENT_BENEFIT_TYPES = {
    NONE: '',
    OUROCAP: 'ourocap',
    LIVELO: 'livelo',
};

export const SETTLEMENT_BENEFIT_OPTIONS = [
    { value: SETTLEMENT_BENEFIT_TYPES.NONE, label: 'Nenhum' },
    { value: SETTLEMENT_BENEFIT_TYPES.OUROCAP, label: 'Ourocap' },
    { value: SETTLEMENT_BENEFIT_TYPES.LIVELO, label: 'Livelo' },
];

const hasFilledValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

export const getSettlementBenefitType = (caseData = {}) => {
    if (hasFilledValue(caseData.ourocap_value)) {
        return SETTLEMENT_BENEFIT_TYPES.OUROCAP;
    }

    if (hasFilledValue(caseData.livelo_points)) {
        return SETTLEMENT_BENEFIT_TYPES.LIVELO;
    }

    return SETTLEMENT_BENEFIT_TYPES.NONE;
};

export const hasSettlementBenefit = (caseData = {}) => getSettlementBenefitType(caseData) !== SETTLEMENT_BENEFIT_TYPES.NONE;

export const validateSettlementBenefit = ({ settlementBenefitType, ourocap_value, livelo_points }) => {
    if (settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.OUROCAP) {
        if (!hasFilledValue(ourocap_value)) {
            return 'Informe o valor do Ourocap.';
        }

        const parsedValue = Number.parseFloat(ourocap_value);
        if (Number.isNaN(parsedValue)) {
            return 'Informe um valor válido para o Ourocap.';
        }

        if (parsedValue < 500) {
            return 'O valor do Ourocap deve ser de no mínimo R$ 500,00.';
        }
    }

    if (settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.LIVELO) {
        if (!hasFilledValue(livelo_points)) {
            return 'Informe a quantidade de pontos Livelo.';
        }

        const parsedValue = Number.parseInt(livelo_points, 10);
        if (Number.isNaN(parsedValue) || parsedValue < 1) {
            return 'Informe uma quantidade válida de pontos Livelo.';
        }
    }

    return null;
};

export const normalizeSettlementBenefitPayload = ({ settlementBenefitType, ourocap_value, livelo_points }) => ({
    ourocap_value: settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.OUROCAP && hasFilledValue(ourocap_value)
        ? Number.parseFloat(ourocap_value)
        : null,
    livelo_points: settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.LIVELO && hasFilledValue(livelo_points)
        ? Number.parseInt(livelo_points, 10)
        : null,
});

export const formatLiveloPoints = (value) => {
    if (!hasFilledValue(value)) {
        return '-';
    }

    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue)) {
        return '-';
    }

    return new Intl.NumberFormat('pt-BR').format(parsedValue);
};
