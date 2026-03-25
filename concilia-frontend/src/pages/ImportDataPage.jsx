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
  FaSync,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import styles from '../styles/ImportDataPage.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

const IMPORT_BATCH_SIZE = 500;

const columnMapping = {
  NPJ: 'internal_number',
  'N° do Processo': 'case_number',
  'Nº do Processo': 'case_number',
  'Numero do Processo': 'case_number',
  'Número do Processo': 'case_number',
  'Número Interno': 'internal_number',
  'Responsável Principal': 'lawyer_name',
  'Responsavel Principal': 'lawyer_name',
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
  action_object: 'Objeto da ação',
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

const normalizeValue = (value) => {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
};

const parseLineIndex = (lineLabel) => {
  const matched = String(lineLabel ?? '').match(/(\d+)/);
  return matched ? Number(matched[1]) - 1 : -1;
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

  // --- TAB ---
  const [activeTab, setActiveTab] = useState('import');

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

  // --- SYNC ALÇADA ---
  const [alcadaFileName, setAlcadaFileName] = useState('');
  const [alcadaParsedRows, setAlcadaParsedRows] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [alcadaError, setAlcadaError] = useState('');
  const [alcadaResult, setAlcadaResult] = useState(null);

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
    const dataRows = matrix.slice(1).filter((row) =>
      row.some((cell) => normalizeValue(cell) !== '')
    );

    if (!dataRows.length) {
      throw new Error('Nenhuma linha preenchida foi encontrada no arquivo.');
    }

    return dataRows.map((row) => {
      const mappedRow = {};
      headers.forEach((header, index) => {
        if (!header) return;
        const dbField = columnMapping[header] || header;
        mappedRow[dbField] = normalizeValue(row[index]);
      });
      return mappedRow;
    });
  };

  const parseSpreadsheetFile = async (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          skipEmptyLines: true,
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
      const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });
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
      const rowBatches = [];
      for (let index = 0; index < rowsToSend.length; index += IMPORT_BATCH_SIZE) {
        rowBatches.push(rowsToSend.slice(index, index + IMPORT_BATCH_SIZE));
      }

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
      setPageError('O servidor não conseguiu processar a importação agora. Tente novamente.');
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

  const handleAlcadaFileChange = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    setAlcadaError('');
    setAlcadaResult(null);
    try {
      const parsedRows = await parseSpreadsheetFile(file);
      setAlcadaFileName(file.name);
      setAlcadaParsedRows(parsedRows);
    } catch (error) {
      event.target.value = '';
      setAlcadaFileName('');
      setAlcadaParsedRows([]);
      setAlcadaError(error.message || 'Não foi possível ler o arquivo selecionado.');
    }
  };

  const runSyncAlcada = async () => {
    if (!selectedClient) {
      setAlcadaError('Nenhum cliente de destino foi encontrado.');
      return;
    }
    if (!alcadaParsedRows.length) {
      setAlcadaError('Selecione uma planilha antes de sincronizar.');
      return;
    }
    setIsSyncing(true);
    setAlcadaError('');
    setAlcadaResult(null);
    try {
      const response = await apiClient.post(
        '/cases/sync-alcada',
        { client_id: selectedClient, cases: alcadaParsedRows },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlcadaResult(response.data);
    } catch (error) {
      if (error.response?.status === 422) {
        const errs = (error.response.data?.errors || []).flatMap((e) => e.errors || []);
        setAlcadaError(`Erros de validação: ${errs.join('; ')}`);
      } else {
        setAlcadaError('Erro ao sincronizar. Tente novamente.');
      }
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
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
          <p>Fluxo direto para planilhas, resumo do processamento e saneamento imediato no front.</p>
        </div>
        <button type="button" className={styles.templateButton} onClick={handleDownloadTemplate}>
          <FaDownload />
          Baixar modelo
        </button>
      </header>

      {/* --- TABS --- */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'import' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <FaFileUpload /> Importar Casos
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'alcada' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('alcada')}
        >
          <FaSync /> Sincronizar Alçada
        </button>
      </div>

      {/* ========== ABA: SINCRONIZAR ALÇADA ========== */}
      {activeTab === 'alcada' && (
        <div>
          <div className={styles.alcadaWarningBanner}>
            <FaExclamationTriangle style={{ flexShrink: 0 }} />
            <span>
              <strong>Atenção:</strong> casos que já possuem alçada e <strong>não aparecerem</strong> nesta planilha
              terão a alçada removida e sairão do pipeline automaticamente.
            </span>
          </div>

          <section className={styles.panelCard} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Sincronização semanal de alçada</h2>
                <p>Envie a planilha BASE BB com os valores de alçada. O sistema atualiza quem entra e quem sai do pipeline.</p>
              </div>
              <span className={styles.clientBadge}>{selectedClientName || 'Cliente não definido'}</span>
            </div>

            <label className={styles.fieldLabel} htmlFor="alcada-upload">Selecionar planilha de alçada</label>
            <div className={styles.fileRow}>
              <input
                id="alcada-upload"
                type="file"
                className={styles.hiddenInput}
                accept=".csv,.xlsx,.xls"
                onChange={handleAlcadaFileChange}
              />
              <label htmlFor="alcada-upload" className={styles.filePicker}>
                <span className={styles.filePickerButton}>Escolher arquivo</span>
                <span className={styles.filePickerName}>{alcadaFileName || 'Nenhum arquivo selecionado'}</span>
              </label>
            </div>

            {alcadaParsedRows.length > 0 && (
              <div className={styles.helpBox} style={{ marginTop: '0.75rem' }}>
                <FaCheckCircle style={{ color: '#38a169', marginRight: '0.4rem' }} />
                <strong>{alcadaParsedRows.length}</strong> registros lidos da planilha. Clique em "Sincronizar" para processar.
              </div>
            )}

            {alcadaError && (
              <div className={styles.errorBox} style={{ marginTop: '0.75rem' }}>
                <FaExclamationTriangle />
                <span>{alcadaError}</span>
              </div>
            )}

            <div className={styles.actionRow} style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={runSyncAlcada}
                disabled={!alcadaParsedRows.length || isSyncing || !selectedClient}
              >
                <FaSync />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Alçada'}
              </button>
              {alcadaFileName && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => { setAlcadaFileName(''); setAlcadaParsedRows([]); setAlcadaResult(null); setAlcadaError(''); }}
                  disabled={isSyncing}
                >
                  Limpar
                </button>
              )}
            </div>
          </section>

          {alcadaResult && (
            <section className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Resultado da sincronização</h2>
                  <p>{alcadaResult.message}</p>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusCONCLUIDO}`}>CONCLUÍDO</span>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.metricCard}>
                  <span>Processados com sucesso</span>
                  <strong>{alcadaResult.success_count ?? 0}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Novos processos</span>
                  <strong>{alcadaResult.created_count ?? 0}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Processos atualizados</span>
                  <strong>{alcadaResult.updated_count ?? 0}</strong>
                </div>
                <div className={styles.metricCard} style={{ borderColor: '#E53E3E' }}>
                  <span>Removidos da alçada</span>
                  <strong style={{ color: '#E53E3E' }}>{alcadaResult.zeroed_count ?? 0}</strong>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========== ABA: IMPORTAR CASOS ========== */}
      {activeTab === 'import' && (
        <>
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
              <p>CSV, XLSX e XLS. O envio só é liberado depois que o arquivo for carregado.</p>
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
            <strong>Fluxo:</strong> selecione a planilha, envie e o sistema processa em lotes automáticos. Depois confira o resumo e trate as inconsistências na tabela de saneamento logo abaixo.
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
        </>
      )}
    </div>
  );
};

export default ImportDataPage;
