import * as XLSX from 'xlsx';
import apiClient from '../api';
import { normalizeCaseTags } from '../constants/caseTags';
import {
    getLegalCaseStatusDetails,
    isTerminalLegalCaseStatus,
} from '../constants/legalCaseStatus';

const MAX_EXPORT_PAGE_SIZE = 200;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

const PRIORITY_LABELS = {
    baixa: 'Baixa',
    media: 'Media',
    alta: 'Alta',
};

const EXPORT_COLUMNS = [
    { header: 'ID', getValue: (legalCase) => legalCase?.id ?? '' },
    { header: 'Numero do processo', getValue: (legalCase) => legalCase?.case_number || '' },
    { header: 'Cliente', getValue: (legalCase) => getDisplayValue(legalCase?.client, '') },
    { header: 'Comarca', getValue: (legalCase) => legalCase?.comarca || '' },
    { header: 'Autor', getValue: (legalCase) => legalCase?.opposing_party || legalCase?.plaintiff || '' },
    { header: 'Reu', getValue: (legalCase) => legalCase?.defendant || '' },
    { header: 'Causa de pedir', getValue: (legalCase) => getActionObjectName(legalCase) },
    { header: 'Status', getValue: (legalCase) => getLegalCaseStatusDetails(legalCase?.status).name },
    { header: 'Prioridade', getValue: (legalCase) => PRIORITY_LABELS[legalCase?.priority] || legalCase?.priority || '' },
    { header: 'Responsavel principal', getValue: (legalCase) => getResponsibleName(legalCase) },
    { header: 'Indicador', getValue: (legalCase) => getIndicatorName(legalCase) },
    { header: 'Valor da causa', getValue: (legalCase) => getNumericValue(legalCase?.cause_value) },
    { header: 'Valor de alcada', getValue: (legalCase) => getNumericValue(legalCase?.original_value) },
    { header: 'Valor de acordo', getValue: (legalCase) => getNumericValue(legalCase?.agreement_value) },
    { header: 'Ourocap', getValue: (legalCase) => getNumericValue(legalCase?.ourocap_value) },
    { header: 'Economia', getValue: (legalCase) => getEconomyValue(legalCase) },
    { header: 'Etiquetas', getValue: (legalCase) => normalizeCaseTags(legalCase?.tags).map((tag) => tag.text).join(', ') },
    { header: 'Atrasado (+5 dias)', getValue: (legalCase) => (isDelayedCaseForExport(legalCase) ? 'Sim' : 'Nao') },
    { header: 'Dias sem atualizacao', getValue: (legalCase) => getDaysSinceUpdate(legalCase) },
    { header: 'Criado em', getValue: (legalCase) => formatDateTime(legalCase?.created_at) },
    { header: 'Atualizado em', getValue: (legalCase) => formatDateTime(legalCase?.updated_at) },
];

const getDisplayValue = (value, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' || typeof value === 'number') {
        const normalizedValue = String(value).trim();
        return normalizedValue || fallback;
    }
    if (typeof value === 'object') {
        return value.name || value.nome || fallback;
    }
    return fallback;
};

const getActionObjectName = (legalCase) =>
    getDisplayValue(legalCase?.actionObject || legalCase?.action_object, '');

const getResponsibleName = (legalCase) =>
    getDisplayValue(
        legalCase?.agreement_checklist_data?.indication_checklist?.assigned_operator || legalCase?.lawyer,
        'Sem responsavel'
    );

const getIndicatorName = (legalCase) =>
    getDisplayValue(
        legalCase?.indicator
            || legalCase?.agreement_checklist_data?.indication_checklist?.indicator
            || legalCase?.agreement_checklist_data?.indication_checklist?.completed_by,
        ''
    );

const getNumericValue = (value) => {
    const numericValue = Number.parseFloat(value);
    return Number.isFinite(numericValue) ? numericValue : '';
};

const getEconomyValue = (legalCase) => {
    const originalValue = Number.parseFloat(legalCase?.original_value);
    const agreementValue = Number.parseFloat(legalCase?.agreement_value);

    if (!Number.isFinite(originalValue) || !Number.isFinite(agreementValue)) {
        return '';
    }

    return originalValue - agreementValue;
};

const parseDate = (value) => {
    if (!value) return null;
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDateTime = (value) => {
    const parsedDate = parseDate(value);
    if (!parsedDate) return '';

    return parsedDate.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getDaysSinceUpdate = (legalCase, referenceDate = new Date()) => {
    const lastUpdate = parseDate(legalCase?.updated_at);
    if (!lastUpdate) return '';

    return Math.ceil(Math.abs(referenceDate - lastUpdate) / MILLISECONDS_PER_DAY);
};

export const isDelayedCaseForExport = (legalCase, referenceDate = new Date()) => {
    if (isTerminalLegalCaseStatus(legalCase?.status)) {
        return false;
    }

    const daysSinceUpdate = getDaysSinceUpdate(legalCase, referenceDate);
    return Number.isFinite(daysSinceUpdate) && daysSinceUpdate > 5;
};

const compactParams = (params = {}) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

export const fetchAllCasesForExport = async (params = {}, token = '') => {
    const items = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
        const response = await apiClient.get('/cases', {
            params: {
                ...compactParams(params),
                page: currentPage,
                per_page: MAX_EXPORT_PAGE_SIZE,
            },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const payload = response.data;
        if (Array.isArray(payload)) {
            return payload;
        }

        items.push(...(Array.isArray(payload?.data) ? payload.data : []));
        lastPage = Number(payload?.last_page || 1);
        currentPage += 1;
    } while (currentPage <= lastPage);

    return items;
};

export const sortCasesByUpdatedAtDesc = (cases = []) =>
    [...cases].sort((firstCase, secondCase) => {
        const firstDate = parseDate(firstCase?.updated_at);
        const secondDate = parseDate(secondCase?.updated_at);
        return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
    });

export const downloadCasesWorkbook = (cases = [], options = {}) => {
    const headers = EXPORT_COLUMNS.map((column) => column.header);
    const rows = cases.map((legalCase) => EXPORT_COLUMNS.map((column) => column.getValue(legalCase)));
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const fileDate = new Date().toISOString().slice(0, 10);
    const filePrefix = options.filePrefix || 'casos';
    const sheetName = String(options.sheetName || 'Casos').slice(0, 31);

    worksheet['!cols'] = EXPORT_COLUMNS.map((column) => ({
        wch: Math.min(Math.max(column.header.length + 4, 14), 32),
    }));
    worksheet['!autofilter'] = {
        ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: rows.length, c: headers.length - 1 },
        }),
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filePrefix}_${fileDate}.xlsx`);
};
