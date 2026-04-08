import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaFileExport,
  FaFileUpload,
  FaFilter,
  FaSave,
  FaTrashAlt,
  FaUpload,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import styles from '../styles/ImportDataPage.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

const MAX_IMPORT_BATCH_ROWS = 500;
const MAX_IMPORT_BATCH_PAYLOAD_BYTES = 900 * 1024;
const MAX_IMPORT_FILE_SIZE_BYTES = 1024 * 1024;

const spreadsheetLayouts = {
  GENERIC: 'generic',
  WEEKLY_BANK: 'weekly_bank',
};

const weeklyBankLayoutMarkers = [
  'TX_NR_IVT',
  'NR_PRC1',
  'NM_RZSC_CLI',
  'NM_TIP_EST_ACRD1',
  'Comarca',
];

const columnMapping = {
  NPJ: 'internal_number',
  'N° do Processo': 'case_number',
  'Nº do Processo': 'case_number',
  'Numero do Processo': 'case_number',
  'Número do Processo': 'case_number',
  'Numero Processo': 'case_number',
  'Número Processo': 'case_number',
  'Número Interno': 'internal_number',
  'Responsável Principal': 'lawyer_name',
  'Responsavel Principal': 'lawyer_name',
  'Advogado Responsável': 'lawyer_name',
  'Advogado Responsavel': 'lawyer_name',
  'Causas de Pedir': 'action_object',
  'Causa de Pedir': 'action_object',
  'Data do Ajuizameto': 'start_date',
  'Data do Ajuizamento': 'start_date',
  'Data da Distribuição ao Escritório': 'start_date',
  'Data da Distribuicao ao Escritorio': 'start_date',
  'Data de Distribuição': 'start_date',
  'Data de Distribuicao': 'start_date',
  Advogado: 'lawyer_name',
  'Polo Ativo': 'opposing_party',
  'Polo Passivo': 'defendant',
  Autor: 'opposing_party',
  Réu: 'defendant',
  Reu: 'defendant',
  'Nome do Advogado Responsável': 'lawyer_name',
  'Nome do Advogado Responsavel': 'lawyer_name',
  'Advogado Adverso': 'opposing_lawyer',
  'Advogados Adversos': 'opposing_lawyer',
  Comarca: 'comarca',
  Vara: 'special_court',
  Cidade: 'city',
  UF: 'state',
  'Juizado Especial': 'special_court',
  'Valor da Causa': 'cause_value',
  'Valor Acordo': 'agreement_value',
  'Valor Alçada': 'original_value',
  'Valor Alcada': 'original_value',
  'Valor de Alçada': 'original_value',
  'Valor de Alcada': 'original_value',
  'Valor da PCOND': 'pcond_probability',
  'Propostas Portal Acordos': 'portal_agreement_offers',
  'Observações Campanhas': 'campaign_observations',
  Prioridade: 'priority',
  Obs: 'description',
};

const fieldLabels = {
  case_number: 'Processo',
  opposing_party: 'Autor',
  defendant: 'Réu',
  action_object: 'Causa de pedir',
  lawyer_name: 'Advogado responsável',
  comarca: 'Comarca',
  cause_value: 'Valor da causa',
};

const editableColumns = [
  'case_number',
  'opposing_party',
  'defendant',
  'action_object',
  'lawyer_name',
  'comarca',
  'cause_value',
];

const templateHeaders = [
  'Número do Processo',
  'Número Interno',
  'Causas de Pedir',
  'Data de Distribuição',
  'Autor',
  'Réu',
  'Nome do Advogado Responsável',
  'Advogado Adverso',
  'Comarca',
  'Vara',
  'Cidade',
  'UF',
  'Valor da Causa',
  'Valor da PCOND',
  'Prioridade',
  'Obs',
];

const templateExampleRow = [
  '0000000-00.2024.8.26.0000',
  '123456',
  'Indenização por danos morais',
  '01/02/2026',
  'Maria da Silva',
  'Banco do Brasil S.A.',
  'Marcos Délli',
  'Dr. Estranho',
  'Fortaleza',
  '2ª Vara Cível',
  'Fortaleza',
  'CE',
  '10000,00',
  '3500,00',
  'media',
  'Observação de exemplo',
];

const normalizeHeader = (header) =>
  String(header ?? '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeComparableText = (value) =>
  normalizeHeader(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeValue = (value) => {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  return `${(bytes / 1024).toFixed(bytes >= 100 * 1024 ? 0 : 1)} KB`;
};

const measureImportPayloadBytes = (clientId, rows) =>
  new TextEncoder().encode(
    JSON.stringify({
      client_id: clientId,
      cases: rows.map((row) => row.data),
    })
  ).length;

const buildImportBatches = (rowsToSend, clientId) => {
  const batches = [];
  let currentBatch = [];

  rowsToSend.forEach((row) => {
    const nextBatch = [...currentBatch, row];
    const exceedsRowLimit = nextBatch.length > MAX_IMPORT_BATCH_ROWS;
    const exceedsPayloadLimit =
      measureImportPayloadBytes(clientId, nextBatch) > MAX_IMPORT_BATCH_PAYLOAD_BYTES;

    if ((exceedsRowLimit || exceedsPayloadLimit) && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [row];

      if (measureImportPayloadBytes(clientId, currentBatch) > MAX_IMPORT_BATCH_PAYLOAD_BYTES) {
        throw new Error(
          `A linha ${row.lineNumber} gera um lote acima do limite do servidor. Divida o conteúdo dessa linha ou remova colunas muito extensas antes de reenviar.`
        );
      }

      return;
    }

    if (exceedsPayloadLimit) {
      throw new Error(
        `A linha ${row.lineNumber} gera um lote acima do limite do servidor. Divida o conteúdo dessa linha ou remova colunas muito extensas antes de reenviar.`
      );
    }

    currentBatch = nextBatch;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

const compactMappedRow = (row) =>
  Object.fromEntries(
    Object.entries(row).filter(([, value]) => normalizeValue(value) !== '')
  );

const pickFirstFilledValue = (...values) => {
  for (const value of values) {
    const normalized = normalizeValue(value);
    if (normalized !== '') {
      return normalized;
    }
  }

  return '';
};

const buildLabeledImportNote = (label, value) => {
  const normalized = normalizeValue(value);
  return normalized ? `${label}: ${normalized}` : '';
};

const buildImportNote = (segments) =>
  segments
    .map((segment) => normalizeValue(segment))
    .filter(Boolean)
    .join(' | ');

const buildSpreadsheetRowByHeader = (headers, row) => {
  const rowByHeader = {};

  headers.forEach((header, index) => {
    if (!header) return;
    rowByHeader[header] = row[index];
  });

  return rowByHeader;
};

const resolveWorksheetDataRange = (worksheet) => {
  const fallbackRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const cellAddresses = Object.keys(worksheet).filter((address) => !address.startsWith('!'));

  if (!cellAddresses.length) {
    return XLSX.utils.encode_range(fallbackRange);
  }

  let minRow = fallbackRange.s.r;
  let minCol = fallbackRange.s.c;
  let maxRow = fallbackRange.s.r;
  let maxCol = fallbackRange.s.c;
  let hasValueCell = false;

  cellAddresses.forEach((address) => {
    const cell = worksheet[address];
    const rawValue = cell?.w ?? cell?.v;

    if (normalizeValue(rawValue) === '') {
      return;
    }

    const decodedCell = XLSX.utils.decode_cell(address);

    minRow = Math.min(minRow, decodedCell.r);
    minCol = Math.min(minCol, decodedCell.c);
    maxRow = Math.max(maxRow, decodedCell.r);
    maxCol = Math.max(maxCol, decodedCell.c);
    hasValueCell = true;
  });

  if (!hasValueCell) {
    return XLSX.utils.encode_range(fallbackRange);
  }

  return XLSX.utils.encode_range({
    s: { r: minRow, c: minCol },
    e: { r: maxRow, c: maxCol },
  });
};

const detectSpreadsheetLayout = (headers) => {
  const comparableHeaders = new Set(headers.map(normalizeComparableText).filter(Boolean));

  const isWeeklyBankLayout = weeklyBankLayoutMarkers.every((header) =>
    comparableHeaders.has(normalizeComparableText(header))
  );

  return isWeeklyBankLayout ? spreadsheetLayouts.WEEKLY_BANK : spreadsheetLayouts.GENERIC;
};

const mapGenericSpreadsheetRow = (headers, row) => {
  const mappedRow = {};

  headers.forEach((header, index) => {
    if (!header) return;
    const dbField = columnMapping[header] || header;
    mappedRow[dbField] = normalizeValue(row[index]);
  });

  return compactMappedRow(mappedRow);
};

const mapWeeklyBankSpreadsheetRow = (headers, row) => {
  const rowByHeader = buildSpreadsheetRowByHeader(headers, row);
  const caseType = normalizeValue(rowByHeader['TX_TIP_ACAO']);
  const actionObject = pickFirstFilledValue(rowByHeader['Causa de Pedir'], caseType);
  const productDescriptor = buildImportNote([
    normalizeValue(rowByHeader['Nome do Produto']),
    normalizeValue(rowByHeader['Modalidade do Produto']),
  ]);
  const courtDescriptor = buildImportNote([
    normalizeValue(rowByHeader['NM_ORG_TST']),
    normalizeValue(rowByHeader['NM_CMPT_ORG_TST']),
  ]);

  return compactMappedRow({
    case_number: pickFirstFilledValue(rowByHeader.TX_NR_IVT, rowByHeader['Número do Processo']),
    internal_number: pickFirstFilledValue(rowByHeader.NR_PRC1, rowByHeader.NPJ),
    lawyer_name: rowByHeader.NM_RZSC_CLI,
    action_object: actionObject,
    opposing_lawyer: rowByHeader.Advogado_Adverso,
    comarca: rowByHeader.Comarca,
    city: rowByHeader.Comarca,
    state: rowByHeader['UF da Comarca'],
    special_court: pickFirstFilledValue(rowByHeader.NM_CMPT_ORG_TST, rowByHeader.NM_ORG_TST),
    cause_value: rowByHeader.VL_PRC,
    original_value: pickFirstFilledValue(
      rowByHeader.VL_PRM_FNCO1,
      rowByHeader.VL_CPRP1,
      rowByHeader.VL_ACRD1
    ),
    pcond_probability: rowByHeader.VL_CPRP1,
    agreement_value: rowByHeader.VL_ACRD1,
    description: pickFirstFilledValue(
      rowByHeader.TX_OBS_ACRD1,
      buildImportNote([
        buildLabeledImportNote('Status do acordo', rowByHeader.NM_TIP_EST_ACRD1),
        buildLabeledImportNote('Fase no banco', rowByHeader.TX_EST_PRC),
      ])
    ),
    campaign_observations: buildImportNote([
      buildLabeledImportNote('Polo', rowByHeader.Polo),
      buildLabeledImportNote('Tipo de ação', caseType),
      buildLabeledImportNote('Status do acordo', rowByHeader.NM_TIP_EST_ACRD1),
      buildLabeledImportNote('Produto', productDescriptor),
      buildLabeledImportNote('Órgão julgador', courtDescriptor),
      buildLabeledImportNote('Observação do banco', rowByHeader.TX_OBS_ACRD1),
    ]),
    polo: rowByHeader.Polo,
  });
};

const parseLineIndex = (lineLabel) => {
  const matched = String(lineLabel ?? '').match(/(\d+)/);
  return matched ? Number(matched[1]) - 1 : -1;
};

const isSpreadsheetMetadataRow = (row) => {
  const populatedEntries = Object.entries(row).filter(([, value]) => normalizeValue(value) !== '');

  if (!populatedEntries.length) {
    return true;
  }

  if (row.case_number) {
    return false;
  }

  if (populatedEntries.length !== 1) {
    return false;
  }

  const [field, value] = populatedEntries[0];
  if (field !== 'internal_number') {
    return false;
  }

  const normalizedText = normalizeComparableText(value);

  return [
    'filtros aplicados',
    'filtro aplicado',
    'situacao_proposta',
    'situacao proposta',
    'toggle',
    'polo',
  ].some((keyword) => normalizedText.includes(keyword));
};

const inferErrorCode = (messages = []) => {
  const normalized = messages.join(' ').toLowerCase();

  if (normalized.includes('obrigatório') || normalized.includes('obrigatorio')) {
    return 'CAMPOS_OBRIGATORIOS_AUSENTES';
  }
  if (normalized.includes('não foi encontrado') || normalized.includes('nao foi encontrado')) {
    return 'REFERENCIA_NAO_ENCONTRADA';
  }
  if (normalized.includes('já existe') || normalized.includes('ja existe')) {
    return 'PROCESSO_DUPLICADO';
  }
  if (normalized.includes('data inválida') || normalized.includes('data invalida')) {
    return 'DATA_INVALIDA';
  }
  if (normalized.includes('número válido') || normalized.includes('numero valido')) {
    return 'FORMATO_NUMERICO_INVALIDO';
  }

  return 'VALIDACAO_PENDENTE';
};

const createRowDraft = (row, index) => ({
  id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
  lineNumber: index + 1,
  data: row,
  discarded: false,
  status: 'pending',
  errorCode: '',
  errorMessages: [],
  isEdited: false,
});

const ImportDataPage = () => {
  const { token } = useAuth();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [sourceFileName, setSourceFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [summary, setSummary] = useState(null);
  const [filterCode, setFilterCode] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      if (!token) return;

      try {
        const response = await apiClient.get('/clients', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const list = Array.isArray(response.data?.data) ? response.data.data : response.data;
        const normalizedClients = Array.isArray(list) ? list : [];
        setClients(normalizedClients);

        const preferredClient =
          normalizedClients.find((client) =>
            client.name?.toLowerCase().includes('banco do brasil') ||
            client.name?.toLowerCase().includes('bb')
          ) || normalizedClients[0];

        if (preferredClient) {
          setSelectedClient(preferredClient.id);
          setSelectedClientName(preferredClient.name);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        setPageError('Não foi possível carregar os clientes para a importação.');
      }
    };

    fetchClients();
  }, [token]);

  useEffect(() => {
    const currentClient = clients.find((client) => String(client.id) === String(selectedClient));
    setSelectedClientName(currentClient?.name ?? '');
  }, [clients, selectedClient]);

  const activeRows = useMemo(
    () => rows.filter((row) => !row.discarded),
    [rows]
  );

  const pendingRows = useMemo(
    () => activeRows.filter((row) => row.status !== 'imported'),
    [activeRows]
  );

  const sanitationRows = useMemo(
    () => activeRows.filter((row) => row.status === 'error'),
    [activeRows]
  );

  const visibleSanitationRows = useMemo(() => {
    if (!filterCode) return sanitationRows;
    return sanitationRows.filter((row) => row.errorCode === filterCode);
  }, [filterCode, sanitationRows]);

  const selectedSanitationRows = useMemo(
    () => sanitationRows.filter((row) => selectedRowIds.includes(row.id)),
    [sanitationRows, selectedRowIds]
  );

  const availableErrorCodes = useMemo(
    () => Array.from(new Set(sanitationRows.map((row) => row.errorCode).filter(Boolean))),
    [sanitationRows]
  );

  const recomputeSummary = (nextRows, overrides = {}) => {
    const previousSummary = summary ?? {};
    const currentActiveRows = nextRows.filter((row) => !row.discarded);
    const currentSanitationRows = currentActiveRows.filter((row) => row.status === 'error');
    const currentReadyRows = currentActiveRows.filter(
      (row) => row.status !== 'error' && row.status !== 'imported'
    );

    setSummary({
      status: overrides.status ?? (currentSanitationRows.length ? 'PENDENTE_DE_SANEAMENTO' : 'PRONTO_PARA_ENVIO'),
      fileName: overrides.fileName ?? sourceFileName,
      totalRows: nextRows.length,
      activeRows: currentActiveRows.length,
      successCount: overrides.successCount ?? previousSummary.successCount ?? 0,
      createdCount: overrides.createdCount ?? previousSummary.createdCount ?? 0,
      updatedCount: overrides.updatedCount ?? previousSummary.updatedCount ?? 0,
      errorCount: currentSanitationRows.length,
      discardedCount: nextRows.filter((row) => row.discarded).length,
      readyToRetryCount: overrides.readyToRetryCount ?? currentReadyRows.length,
      editedCount: currentActiveRows.filter((row) => row.isEdited).length,
      message: overrides.message ?? previousSummary.message ?? '',
    });
  };

  const resetImportState = () => {
    setSourceFileName('');
    setRows([]);
    setSummary(null);
    setSelectedRowIds([]);
    setFilterCode('');
    setUploadProgress('');
  };

  const mapImportedRows = (matrix) => {
    if (!Array.isArray(matrix) || matrix.length < 2) {
      throw new Error('A planilha precisa conter cabeçalho e ao menos uma linha de dados.');
    }

    const headers = matrix[0].map(normalizeHeader);
    const detectedLayout = detectSpreadsheetLayout(headers);
    const dataRows = matrix.slice(1).filter((row) =>
      row.some((cell) => normalizeValue(cell) !== '')
    );

    if (!dataRows.length) {
      throw new Error('Nenhuma linha preenchida foi encontrada no arquivo.');
    }

    const mappedRows = dataRows
      .map((row) =>
        detectedLayout === spreadsheetLayouts.WEEKLY_BANK
          ? mapWeeklyBankSpreadsheetRow(headers, row)
          : mapGenericSpreadsheetRow(headers, row)
      )
      .filter((row) => !isSpreadsheetMetadataRow(row));

    if (!mappedRows.length) {
      throw new Error('Nenhuma linha válida de processo foi encontrada no arquivo.');
    }

    return mappedRows;
  };

  const parseSpreadsheetFile = async (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          skipEmptyLines: 'greedy',
          complete: (results) => {
            try {
              resolve(mapImportedRows(results.data));
            } catch (error) {
              reject(error);
            }
          },
          error: reject,
        });
      });
    }

    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const dataRange = resolveWorksheetDataRange(firstSheet);
      const matrix = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false,
        range: dataRange,
      });
      return mapImportedRows(matrix);
    }

    throw new Error('Formato não suportado. Use CSV, XLSX ou XLS.');
  };

  const handleDownloadTemplate = () => {
    const csvContent = `${templateHeaders.join(';')}\n${templateExampleRow.join(';')}`;
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Importacao_NIC.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    setPageError('');
    setSelectedRowIds([]);
    setFilterCode('');

    try {
      if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
        throw new Error(
          `O arquivo excede o limite de 1 MB (${formatFileSize(file.size)}). Divida a planilha antes de importar.`
        );
      }

      const parsedRows = await parseSpreadsheetFile(file);
      const draftedRows = parsedRows.map((row, index) => createRowDraft(row, index));

      setSourceFileName(file.name);
      setRows(draftedRows);
      setSummary({
        status: 'PRONTO_PARA_ENVIO',
        fileName: file.name,
        totalRows: draftedRows.length,
        activeRows: draftedRows.length,
        successCount: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        discardedCount: 0,
        readyToRetryCount: draftedRows.length,
        editedCount: 0,
        message: 'Arquivo carregado com sucesso. Revise e envie quando estiver pronto.',
      });
      event.target.value = '';
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      event.target.value = '';
      resetImportState();
      setPageError(error.message || 'Não foi possível ler o arquivo selecionado.');
    }
  };

  const runImport = async (rowsToSend = pendingRows) => {
    if (!selectedClient) {
      setPageError('Nenhum cliente de destino foi encontrado para a importação.');
      return;
    }

    if (!rowsToSend.length) {
      setPageError('Selecione ou mantenha ao menos uma linha para processar.');
      return;
    }

    setIsUploading(true);
    setPageError('');
    setUploadProgress('');

    try {
      const rowBatches = buildImportBatches(rowsToSend, selectedClient);

      let workingRows = [...rows];
      let totalSuccess = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      let hasBatchErrors = false;

      for (let batchIndex = 0; batchIndex < rowBatches.length; batchIndex += 1) {
        const batch = rowBatches[batchIndex];
        const batchNumber = batchIndex + 1;
        const progressLabel = `Lote ${batchNumber} de ${rowBatches.length}`;
        setUploadProgress(progressLabel);
        setSummary((currentSummary) => ({
          ...(currentSummary ?? {}),
          status: 'PROCESSANDO',
          fileName: sourceFileName,
          totalRows: rows.length,
          activeRows: activeRows.length,
          successCount: totalSuccess,
          createdCount: totalCreated,
          updatedCount: totalUpdated,
          errorCount: workingRows.filter((row) => row.status === 'error' && !row.discarded).length,
          discardedCount: workingRows.filter((row) => row.discarded).length,
          readyToRetryCount: workingRows.filter(
            (row) => row.status !== 'error' && row.status !== 'imported' && !row.discarded
          ).length,
          editedCount: workingRows.filter((row) => row.isEdited && !row.discarded).length,
          message: `Processando ${progressLabel.toLowerCase()}...`,
        }));

        try {
          const response = await apiClient.post(
            '/cases/import',
            {
              client_id: selectedClient,
              cases: batch.map((row) => row.data),
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const importedIds = new Set(batch.map((row) => row.id));
          workingRows = workingRows.map((row) =>
            importedIds.has(row.id)
              ? {
                  ...row,
                  status: 'imported',
                  errorCode: '',
                  errorMessages: [],
                  isEdited: false,
                }
              : row
          );

          totalSuccess += response.data?.success_count ?? batch.length;
          totalCreated += response.data?.created_count ?? 0;
          totalUpdated += response.data?.updated_count ?? 0;
        } catch (error) {
          if (error.response?.status === 422) {
            hasBatchErrors = true;
            const backendErrors = error.response.data?.errors || [];
            const errorByLine = new Map(
              backendErrors.map((errorItem) => [parseLineIndex(errorItem.line), errorItem.errors || []])
            );

            const batchErrorMap = new Map(
              batch.map((row, localIndex) => [row.id, errorByLine.get(localIndex) || []])
            );

            workingRows = workingRows.map((row) => {
              if (!batchErrorMap.has(row.id)) return row;

              const messages = batchErrorMap.get(row.id) || [];
              if (!messages.length) {
                return {
                  ...row,
                  status: 'clean',
                  errorCode: '',
                  errorMessages: [],
                };
              }

              return {
                ...row,
                status: 'error',
                errorCode: inferErrorCode(messages),
                errorMessages: messages,
              };
            });
            continue;
          }

          throw error;
        }
      }

      setRows(workingRows);
      setSelectedRowIds(workingRows.filter((row) => row.status === 'error').map((row) => row.id));
      setSummary({
        status: hasBatchErrors ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO',
        fileName: sourceFileName,
        totalRows: workingRows.length,
        activeRows: workingRows.filter((row) => !row.discarded).length,
        successCount: totalSuccess,
        createdCount: totalCreated,
        updatedCount: totalUpdated,
        errorCount: workingRows.filter((row) => row.status === 'error' && !row.discarded).length,
        discardedCount: workingRows.filter((row) => row.discarded).length,
        readyToRetryCount: workingRows.filter(
          (row) => row.status !== 'error' && row.status !== 'imported' && !row.discarded
        ).length,
        editedCount: workingRows.filter((row) => row.isEdited && !row.discarded).length,
        message: hasBatchErrors
          ? `Processamento concluído em ${rowBatches.length} lotes. Ajuste as linhas com erro e reenvie o saneamento.`
          : `Processamento concluído em ${rowBatches.length} lotes com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao importar:', error);
      if (error.response?.status === 413) {
        setPageError(
          'O lote excedeu o tamanho aceito pela API publicada. Esta versão do importador reduz automaticamente os lotes, mas o ambiente de produção precisa estar atualizado com essa correção.'
        );
      } else {
        setPageError(error.message || 'O servidor não conseguiu processar a importação agora. Tente novamente.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleRowFieldChange = (rowId, field, value) => {
    setRows((currentRows) => {
      const nextRows = currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              data: { ...row.data, [field]: value },
              isEdited: true,
            }
          : row
      );
      recomputeSummary(nextRows);
      return nextRows;
    });
  };

  const handleSaveSanitationRow = (rowId) => {
    setRows((currentRows) => {
      const nextRows = currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              status: 'pending',
              errorCode: '',
              errorMessages: [],
              isEdited: true,
            }
          : row
      );
      recomputeSummary(nextRows, {
        status: nextRows.some((row) => row.status === 'error' && !row.discarded)
          ? 'CONCLUIDO_COM_ERROS'
          : 'PRONTO_PARA_REENVIO',
      });
      return nextRows;
    });
  };

  const handleToggleRowSelection = (rowId) => {
    setSelectedRowIds((currentSelection) =>
      currentSelection.includes(rowId)
        ? currentSelection.filter((id) => id !== rowId)
        : [...currentSelection, rowId]
    );
  };

  const handleToggleVisibleSelection = () => {
    const visibleIds = visibleSanitationRows.map((row) => row.id);
    const hasUnselected = visibleIds.some((id) => !selectedRowIds.includes(id));

    setSelectedRowIds((currentSelection) =>
      hasUnselected
        ? Array.from(new Set([...currentSelection, ...visibleIds]))
        : currentSelection.filter((id) => !visibleIds.includes(id))
    );
  };

  const discardRowsById = (rowIds) => {
    if (!rowIds.length) return;

    setRows((currentRows) => {
      const nextRows = currentRows.map((row) =>
        rowIds.includes(row.id)
          ? {
              ...row,
              discarded: true,
            }
          : row
      );
      recomputeSummary(nextRows, {
        status: nextRows.some((row) => row.status === 'error' && !row.discarded)
          ? 'CONCLUIDO_COM_ERROS'
          : 'PRONTO_PARA_REENVIO',
      });
      return nextRows;
    });

    setSelectedRowIds((currentSelection) => currentSelection.filter((id) => !rowIds.includes(id)));
  };

  const handleDiscardSelected = () => {
    discardRowsById(selectedRowIds);
  };

  const handleApplyDefaultsToSelected = () => {
    if (!selectedRowIds.length) return;

    setRows((currentRows) => {
      const nextRows = currentRows.map((row) => {
        if (!selectedRowIds.includes(row.id)) return row;

        return {
          ...row,
          data: {
            ...row.data,
            action_object: row.data.action_object || 'Importado via planilha',
            priority: row.data.priority || 'media',
            special_court: row.data.special_court || 'Não',
            cause_value: row.data.cause_value || '0',
            original_value: row.data.original_value || '0',
            opposing_party: row.data.opposing_party || 'Parte autora não informada',
            defendant: row.data.defendant || selectedClientName || 'Parte passiva não informada',
          },
          isEdited: true,
        };
      });

      recomputeSummary(nextRows, { status: 'PRONTO_PARA_REENVIO' });
      return nextRows;
    });
  };

  const handleExportLegalOne = async () => {
    setIsExporting(true);
    setPageError('');

    try {
      const response = await apiClient.get('/cases/export', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `legal-one-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setPageError('Não foi possível gerar a exportação Legal One agora.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1>Importação de casos</h1>
          <p>Importador único para os layouts homologados, com atualização automática por número do processo.</p>
        </div>
        <button type="button" className={styles.templateButton} onClick={handleDownloadTemplate}>
          <FaDownload />
          Baixar modelo
        </button>
      </header>

      {pageError && (
        <div className={styles.errorBox}>
          <FaExclamationTriangle />
          <span>{pageError}</span>
        </div>
      )}

      <section className={styles.topGrid}>
        <article className={styles.panelCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Importador de planilhas</h2>
              <p>CSV, XLSX e XLS de at&eacute; 1 MB. O importador reconhece os layouts homologados, ignora linhas vazias e atualiza processos existentes pelo n&uacute;mero do processo.</p>
            </div>
            <span className={styles.clientBadge}>{selectedClientName || 'Cliente não definido'}</span>
          </div>

          <label className={styles.fieldLabel} htmlFor="spreadsheet-upload">
            Selecionar arquivo
          </label>
          <div className={styles.fileRow}>
            <input
              id="spreadsheet-upload"
              type="file"
              className={styles.hiddenInput}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <label htmlFor="spreadsheet-upload" className={styles.filePicker}>
              <span className={styles.filePickerButton}>Escolher arquivo</span>
              <span className={styles.filePickerName}>
                {sourceFileName || 'Nenhum arquivo selecionado'}
              </span>
            </label>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runImport()}
              disabled={!pendingRows.length || isUploading || !selectedClient}
            >
              <FaUpload />
              {isUploading ? 'Processando lotes...' : 'Enviar arquivo'}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetImportState}
              disabled={!rows.length || isUploading}
            >
              Limpar seleção
            </button>
          </div>

          {uploadProgress && <p className={styles.progressText}>{uploadProgress}</p>}

          <div className={styles.helpBox}>
            <strong>Fluxo:</strong> selecione uma planilha homologada de at&eacute; 1 MB, envie e o sistema identifica o layout pelos cabe&ccedil;alhos. Linhas vazias s&atilde;o desconsideradas automaticamente. O envio &eacute; repartido em lotes menores para respeitar o limite da API. Se o processo j&aacute; existir, ele &eacute; atualizado pelo n&uacute;mero do processo; se n&atilde;o existir, &eacute; criado.
          </div>
        </article>

        <article className={styles.panelCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Exportação Legal One</h2>
              <p>A exportação usa a base atual de processos já cadastrados no NIC.</p>
            </div>
            <span className={styles.sectionTag}>CSV</span>
          </div>

          <div className={styles.exportInfo}>
            <p>A planilha é gerada a partir dos processos existentes no NIC para apoio ao fluxo externo do Legal One.</p>
            <ul className={styles.infoList}>
              <li>Usa diretamente os processos disponíveis na base atual.</li>
              <li>Baixa um CSV direto da API atual.</li>
              <li>Pode ser usado como base para adaptação posterior do layout Legal One.</li>
            </ul>
          </div>

          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExportLegalOne}
            disabled={isExporting}
          >
            <FaFileExport />
            {isExporting ? 'Gerando exportação...' : 'Exportar planilha Legal One'}
          </button>
        </article>
      </section>

      {summary && (
        <section className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Resumo do upload</h2>
              <p>{summary.message || 'Acompanhe o status do processamento e o volume de saneamento.'}</p>
            </div>
            <span className={`${styles.statusBadge} ${styles[`status${summary.status}`] || ''}`}>
              {summary.status.replaceAll('_', ' ')}
            </span>
          </div>

          <div className={styles.summaryGrid}>
            <div className={styles.metricCard}>
              <span>Total de linhas</span>
              <strong>{summary.totalRows}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Importados com sucesso</span>
              <strong>{summary.successCount}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Novos processos</span>
              <strong>{summary.createdCount ?? 0}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Processos atualizados</span>
              <strong>{summary.updatedCount ?? 0}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Erros encontrados</span>
              <strong>{summary.errorCount}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Linhas descartadas</span>
              <strong>{summary.discardedCount}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Prontas para reenvio</span>
              <strong>{summary.readyToRetryCount}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Linhas editadas</span>
              <strong>{summary.editedCount}</strong>
            </div>
          </div>
        </section>
      )}

      <section className={styles.sanitationCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Tabela de saneamento</h2>
            <p>Edite as linhas inconsistentes, descarte o que não deve seguir e reenvie o arquivo saneado.</p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => runImport()}
            disabled={!pendingRows.length || isUploading}
          >
            <FaFileUpload />
            {isUploading ? 'Reprocessando lotes...' : 'Reenviar arquivo saneado'}
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterBox}>
            <FaFilter />
            <select value={filterCode} onChange={(event) => setFilterCode(event.target.value)}>
              <option value="">Filtrar por código de erro</option>
              {availableErrorCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleApplyDefaultsToSelected}
              disabled={!selectedSanitationRows.length}
            >
              Aplicar preenchimento padrão
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleDiscardSelected}
              disabled={!selectedSanitationRows.length}
            >
              Descartar selecionadas
            </button>
          </div>
        </div>

        {!visibleSanitationRows.length ? (
          <div className={styles.emptyState}>
            <FaCheckCircle />
            <div>
              <strong>Nenhuma linha pendente de saneamento.</strong>
              <p>Quando a API retornar inconsistências, elas aparecem aqui para edição imediata.</p>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.sanitationTable}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        visibleSanitationRows.length > 0 &&
                        visibleSanitationRows.every((row) => selectedRowIds.includes(row.id))
                      }
                      onChange={handleToggleVisibleSelection}
                    />
                  </th>
                  <th>Linha</th>
                  <th>Código</th>
                  <th>Mensagem</th>
                  <th>Processo</th>
                  <th>Autor</th>
                  <th>Réu</th>
                  <th>Objeto</th>
                  <th>Advogado</th>
                  <th>Comarca</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleSanitationRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(row.id)}
                        onChange={() => handleToggleRowSelection(row.id)}
                      />
                    </td>
                    <td>{row.lineNumber}</td>
                    <td>
                      <span className={styles.codeBadge}>{row.errorCode}</span>
                    </td>
                    <td>
                      <div className={styles.messageCell}>
                        {row.errorMessages.map((message) => (
                          <span key={message}>{message}</span>
                        ))}
                      </div>
                    </td>
                    {editableColumns.map((field) => (
                      <td key={`${row.id}-${field}`}>
                        <input
                          className={styles.inlineInput}
                          value={row.data[field] || ''}
                          placeholder={fieldLabels[field]}
                          onChange={(event) =>
                            handleRowFieldChange(row.id, field, event.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => handleSaveSanitationRow(row.id)}
                          title="Salvar ajustes locais"
                        >
                          <FaSave />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButtonDanger}
                          onClick={() => discardRowsById([row.id])}
                          title="Descartar linha"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ImportDataPage;
