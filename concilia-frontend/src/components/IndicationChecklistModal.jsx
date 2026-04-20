import React, { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/IndicationChecklistModal.module.css';

const createDefaultFormData = () => ({
  responsible_user_id: '',
  materia: {
    is_valid_for_agreement: 'sim',
    notes: '',
  },
  obrigacao: {
    type: 'simples',
  },
  subsidio: {
    available: 'sim',
  },
  analise_subsidio: {
    notes: '',
  },
  litigante_habitual: {
    has_restriction: 'nao',
    notes: '',
  },
  analise_risco: {
    last_analysis_date: '',
  },
  pcond_portal: {
    value: '',
  },
  pcond_processual: {
    value: '',
  },
  alcada: {
    value: '',
  },
});

const FIELD_DESCRIPTORS = {
  materia: ['Objetivo', 'Portal BB', 'A matéria não pode estar entre as contraindicadas'],
  obrigacao: ['Objetivo', 'Portal BB', 'Selecione o tipo aplicável'],
  subsidio: ['Objetivo', 'Portal BB', 'Informe se há subsídio disponibilizado'],
  analise_subsidio: ['Subjetivo', 'Portal BB', 'Descreva a análise feita'],
  litigante_habitual: ['Objetivo', 'Portal BB ou L1', 'Baseado no advogado adverso'],
  analise_risco: ['Objetivo', 'Portal BB', 'Informe a data da última análise de risco'],
  pcond_portal: ['Objetivo', 'Portal BB', 'PCOND registrado no portal'],
  pcond_processual: ['Subjetivo', 'Processo', 'PCOND real e compatibilidade processual'],
  alcada: ['Objetivo', 'Portal BB', 'Valor já existente no caso'],
};

const getChecklistData = (legalCase) => legalCase?.agreement_checklist_data?.indication_checklist || null;

const getOpposingLawyerRecord = (legalCase) => {
  const relationValue = legalCase?.opposing_lawyer;
  if (relationValue && typeof relationValue === 'object' && !Array.isArray(relationValue)) {
    return relationValue;
  }

  const camelCaseValue = legalCase?.opposingLawyer;
  if (camelCaseValue && typeof camelCaseValue === 'object' && !Array.isArray(camelCaseValue)) {
    return camelCaseValue;
  }

  return null;
};

const getDisplayName = (value, fallback = '') => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return value.name || value.nome || fallback;
};

const getActionObjectName = (legalCase) => {
  const actionObjectValue = legalCase?.actionObject || legalCase?.action_object;

  if (!actionObjectValue) {
    return 'Não informado';
  }

  if (typeof actionObjectValue === 'string' || typeof actionObjectValue === 'number') {
    const normalizedValue = String(actionObjectValue).trim();
    return normalizedValue || 'Não informado';
  }

  return actionObjectValue.name || actionObjectValue.nome || 'Não informado';
};

const normalizeCasePayload = (payload) => {
  if (payload && payload.data && !payload.id) {
    return payload.data;
  }

  return payload;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
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

const getInitialResponsibleUserId = (legalCase, checklist) => {
  const value =
    checklist?.assigned_operator?.id
    || legalCase?.user_id
    || legalCase?.lawyer?.id
    || '';

  return value ? String(value) : '';
};

const getDerivedLitiganteRestriction = (legalCase, savedFields) => {
  const opposingLawyer = getOpposingLawyerRecord(legalCase);

  if (typeof opposingLawyer?.is_abusive === 'boolean') {
    return opposingLawyer.is_abusive ? 'sim' : 'nao';
  }

  if (typeof savedFields?.litigante_habitual?.has_restriction === 'boolean') {
    return savedFields.litigante_habitual.has_restriction ? 'sim' : 'nao';
  }

  return 'nao';
};

const getDerivedAlcadaValue = (legalCase, savedFields) =>
  formatCurrency(legalCase?.original_value)
  || savedFields?.alcada?.formatted_value
  || formatCurrency(savedFields?.alcada?.value)
  || '';

const getInitialFormData = (legalCase) => {
  const checklist = getChecklistData(legalCase);
  const savedFields = checklist?.fields || {};
  const defaultData = createDefaultFormData();

  return {
    ...defaultData,
    responsible_user_id: getInitialResponsibleUserId(legalCase, checklist),
    materia: {
      is_valid_for_agreement:
        typeof savedFields.materia?.is_valid_for_agreement === 'boolean'
          ? (savedFields.materia.is_valid_for_agreement ? 'sim' : 'nao')
          : defaultData.materia.is_valid_for_agreement,
      notes: savedFields.materia?.notes || '',
    },
    obrigacao: {
      type: savedFields.obrigacao?.type || defaultData.obrigacao.type,
    },
    subsidio: {
      available: savedFields.subsidio?.available || defaultData.subsidio.available,
    },
    analise_subsidio: {
      notes: savedFields.analise_subsidio?.notes || '',
    },
    litigante_habitual: {
      has_restriction: getDerivedLitiganteRestriction(legalCase, savedFields),
      notes: savedFields.litigante_habitual?.notes || '',
    },
    analise_risco: {
      last_analysis_date: savedFields.analise_risco?.last_analysis_date || '',
    },
    pcond_portal: {
      value: savedFields.pcond_portal?.value || '',
    },
    pcond_processual: {
      value: savedFields.pcond_processual?.value || '',
    },
    alcada: {
      value: getDerivedAlcadaValue(legalCase, savedFields),
    },
  };
};

const getRequestErrorMessage = (requestError) => {
  const validationErrors = requestError.response?.data?.errors;

  if (validationErrors && typeof validationErrors === 'object') {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) {
      return firstError;
    }
  }

  return requestError.response?.data?.message || 'Não foi possível indicar o caso para acordo.';
};

const IndicationChecklistModal = ({ isOpen, legalCase, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [detailedCase, setDetailedCase] = useState(null);
  const [formData, setFormData] = useState(() => createDefaultFormData());
  const [operators, setOperators] = useState([]);
  const [isLoadingCaseDetails, setIsLoadingCaseDetails] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !token) {
      return undefined;
    }

    let active = true;

    setDetailedCase(legalCase);
    setFormData(getInitialFormData(legalCase));
    setError('');
    setIsLoadingCaseDetails(true);
    setIsLoadingOperators(true);

    Promise.all([
      apiClient.get(`/cases/${legalCase.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiClient.get('/users/operators', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([caseResponse, operatorsResponse]) => {
        if (!active) {
          return;
        }

        const resolvedCase = normalizeCasePayload(caseResponse.data) || legalCase;
        const availableOperators = Array.isArray(operatorsResponse.data?.data)
          ? operatorsResponse.data.data
          : Array.isArray(operatorsResponse.data)
            ? operatorsResponse.data
            : [];

        setDetailedCase(resolvedCase);
        setFormData(getInitialFormData(resolvedCase));
        setOperators(availableOperators);
        setFormData((current) => ({
          ...current,
          responsible_user_id:
            current.responsible_user_id
            || (availableOperators.length === 1 ? String(availableOperators[0].id) : ''),
        }));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setOperators([]);
        setDetailedCase(legalCase);
        setError('Não foi possível carregar todos os dados atualizados do caso para indicação.');
      })
      .finally(() => {
        if (active) {
          setIsLoadingCaseDetails(false);
          setIsLoadingOperators(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, legalCase, token]);

  const caseReference = detailedCase || legalCase;

  const caseTitle = useMemo(
    () => caseReference?.case_number || `#${caseReference?.id || ''}`,
    [caseReference]
  );

  const opposingLawyerName = useMemo(
    () => getDisplayName(getOpposingLawyerRecord(caseReference), 'advogado adverso não informado'),
    [caseReference]
  );

  const matterName = useMemo(
    () => getActionObjectName(caseReference),
    [caseReference]
  );

  const litiganteStatusText = useMemo(
    () =>
      formData.litigante_habitual.has_restriction === 'sim'
        ? 'Com restrição de negociação'
        : 'Sem restrição de negociação',
    [formData.litigante_habitual.has_restriction]
  );

  const headerHighlights = useMemo(
    () => [
      {
        label: 'Matéria',
        value: matterName,
      },
      {
        label: 'Alçada',
        value: formData.alcada.value || 'Não informada',
      },
      {
        label: 'Litigante habitual',
        value: litiganteStatusText,
      },
      {
        label: 'Advogado adverso',
        value: opposingLawyerName,
      },
    ],
    [formData.alcada.value, litiganteStatusText, matterName, opposingLawyerName]
  );

  const blockingReasons = useMemo(() => {
    const reasons = [];

    if (formData.materia.is_valid_for_agreement === 'nao') {
      reasons.push('A matéria está entre as contraindicadas.');
    }

    if (formData.subsidio.available === 'nao') {
      reasons.push('Não há subsídio disponibilizado para o caso.');
    }

    if (formData.litigante_habitual.has_restriction === 'sim') {
      reasons.push('O advogado adverso está marcado como litigante abusivo e bloqueia a indicação.');
    }

    return reasons;
  }, [
    formData.materia.is_valid_for_agreement,
    formData.subsidio.available,
    formData.litigante_habitual.has_restriction,
  ]);

  if (!isOpen || !legalCase) {
    return null;
  }

  const handleChange = (section, key, value) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  };

  const handleTopLevelChange = (key, value) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (blockingReasons.length > 0) {
      setError('O caso possui restrições impeditivas e não pode ser indicado para acordo.');
      return;
    }

    if (!formData.responsible_user_id) {
      setError('Selecione o operador que ficará responsável pelo caso.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        responsible_user_id: Number(formData.responsible_user_id),
        materia: {
          is_valid_for_agreement: formData.materia.is_valid_for_agreement === 'sim',
          notes: formData.materia.notes,
        },
        obrigacao: {
          type: formData.obrigacao.type,
        },
        subsidio: {
          available: formData.subsidio.available,
        },
        analise_subsidio: {
          notes: formData.analise_subsidio.notes,
        },
        litigante_habitual: {
          has_restriction: formData.litigante_habitual.has_restriction === 'sim',
          notes: formData.litigante_habitual.notes,
        },
        analise_risco: {
          last_analysis_date: formData.analise_risco.last_analysis_date,
        },
        pcond_portal: {
          value: formData.pcond_portal.value,
        },
        pcond_processual: {
          value: formData.pcond_processual.value,
        },
        alcada: {
          value: formData.alcada.value,
        },
      };

      const response = await apiClient.post(`/cases/${legalCase.id}/indicate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDescriptors = (fieldKey) => (
    <div className={styles.descriptorRow}>
      {FIELD_DESCRIPTORS[fieldKey].map((label) => (
        <span key={label} className={styles.descriptorBadge}>
          {label}
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>INDICAÇÃO DE CASO</p>
            <h2 className={styles.title}>Indicar caso para acordo</h2>
            <p className={styles.subtitle}>
              Processo {caseTitle}. O checklist abaixo é obrigatório para concluir a análise.
            </p>

            <div className={styles.headerHighlights}>
              {headerHighlights.map((item) => (
                <div key={item.label} className={styles.headerHighlightCard}>
                  <span className={styles.headerHighlightLabel}>{item.label}</span>
                  <strong className={styles.headerHighlightValue}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fechar modal"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <section className={`${styles.section} ${styles.fullWidth}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionBadge}>Etapa 1</span>
                  <h3 className={styles.sectionTitle}>Encaminhamento</h3>
                  <p className={styles.sectionText}>
                    Defina o operador responsável e confira os dados objetivos que já vêm do caso.
                  </p>
                </div>
              </div>

              <div className={styles.autoGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Responsável pelo caso (operador)</label>
                  <select
                    value={formData.responsible_user_id}
                    onChange={(event) => handleTopLevelChange('responsible_user_id', event.target.value)}
                    className={styles.input}
                    required
                    disabled={isLoadingOperators || isSubmitting}
                  >
                    <option value="">Selecione um operador</option>
                    {operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>
                        {operator.name}
                      </option>
                    ))}
                  </select>
                  <p className={styles.helperText}>
                    {isLoadingOperators
                      ? 'Carregando operadores ativos...'
                      : 'O operador escolhido passará a ser o responsável do caso.'}
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Matéria do processo</label>
                  <div className={styles.readOnlyField}>{matterName}</div>
                  <p className={styles.helperText}>
                    Dado atual do caso usado como referência para a análise.
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Litigante Habitual</label>
                  {renderDescriptors('litigante_habitual')}
                  <div className={styles.readOnlyField}>{litiganteStatusText}</div>
                  <p className={styles.helperText}>
                    Baseado no advogado adverso: {opposingLawyerName}.
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Alçada</label>
                  {renderDescriptors('alcada')}
                  <div className={styles.readOnlyField}>
                    {formData.alcada.value || 'Não informada'}
                  </div>
                  <p className={styles.helperText}>Valor já existente no caso.</p>
                </div>

                <div className={`${styles.field} ${styles.fullSpan}`}>
                  <label className={styles.label}>Observações sobre litigante habitual</label>
                  <textarea
                    value={formData.litigante_habitual.notes}
                    onChange={(event) => handleChange('litigante_habitual', 'notes', event.target.value)}
                    placeholder="Inclua observações adicionais, se necessário"
                    rows="3"
                    className={styles.textarea}
                  />
                </div>
              </div>
            </section>

            <section className={`${styles.section} ${styles.fullWidth}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionBadge}>Etapa 2</span>
                  <h3 className={styles.sectionTitle}>Checklist Objetivo</h3>
                  <p className={styles.sectionText}>
                    Campos objetivos para validar se o caso pode seguir para acordo.
                  </p>
                </div>
              </div>

              <div className={styles.innerGrid}>
                <div className={styles.fieldCard}>
                  <label className={styles.label}>Matéria</label>
                  {renderDescriptors('materia')}
                  <select
                    value={formData.materia.is_valid_for_agreement}
                    onChange={(event) => handleChange('materia', 'is_valid_for_agreement', event.target.value)}
                    className={styles.input}
                    required
                  >
                    <option value="sim">Não está entre as matérias contraindicadas</option>
                    <option value="nao">Está entre as matérias contraindicadas</option>
                  </select>
                  <textarea
                    value={formData.materia.notes}
                    onChange={(event) => handleChange('materia', 'notes', event.target.value)}
                    placeholder="Observações complementares da matéria"
                    rows="4"
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.fieldCard}>
                  <label className={styles.label}>Obrigação</label>
                  {renderDescriptors('obrigacao')}
                  <select
                    value={formData.obrigacao.type}
                    onChange={(event) => handleChange('obrigacao', 'type', event.target.value)}
                    className={styles.input}
                    required
                  >
                    <option value="simples">Simples</option>
                    <option value="complexa">Complexa</option>
                    <option value="apenas_pecuniaria">Apenas pecuniária</option>
                  </select>
                </div>

                <div className={styles.fieldCard}>
                  <label className={styles.label}>Subsídio</label>
                  {renderDescriptors('subsidio')}
                  <select
                    value={formData.subsidio.available}
                    onChange={(event) => handleChange('subsidio', 'available', event.target.value)}
                    className={styles.input}
                    required
                  >
                    <option value="sim">Há subsídio disponibilizado</option>
                    <option value="nao">Não há subsídio disponibilizado</option>
                  </select>
                  <p className={styles.helperText}>
                    Preenchimento manual: a base atual não traz esse dado automaticamente.
                  </p>
                </div>

                <div className={styles.fieldCard}>
                  <label className={styles.label}>Análise de Risco</label>
                  {renderDescriptors('analise_risco')}
                  <input
                    type="date"
                    value={formData.analise_risco.last_analysis_date}
                    onChange={(event) => handleChange('analise_risco', 'last_analysis_date', event.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={`${styles.fieldCard} ${styles.fullSpan}`}>
                  <label className={styles.label}>PCOND Portal</label>
                  {renderDescriptors('pcond_portal')}
                  <input
                    type="text"
                    value={formData.pcond_portal.value}
                    onChange={(event) => handleChange('pcond_portal', 'value', event.target.value)}
                    placeholder="Informe o PCOND do Portal BB"
                    className={styles.input}
                    required
                  />
                </div>
              </div>
            </section>

            <section className={`${styles.section} ${styles.fullWidth}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionBadge}>Etapa 3</span>
                  <h3 className={styles.sectionTitle}>Análises Complementares</h3>
                  <p className={styles.sectionText}>
                    Campos subjetivos e processuais para registrar o racional da indicação.
                  </p>
                </div>
              </div>

              <div className={styles.innerGrid}>
                <div className={`${styles.fieldCard} ${styles.fullSpan}`}>
                  <label className={styles.label}>Análise do Subsídio</label>
                  {renderDescriptors('analise_subsidio')}
                  <textarea
                    value={formData.analise_subsidio.notes}
                    onChange={(event) => handleChange('analise_subsidio', 'notes', event.target.value)}
                    placeholder="Descreva a análise subjetiva do subsídio"
                    rows="5"
                    className={styles.textarea}
                    required
                  />
                </div>

                <div className={`${styles.fieldCard} ${styles.fullSpan}`}>
                  <label className={styles.label}>PCOND Processual</label>
                  {renderDescriptors('pcond_processual')}
                  <textarea
                    value={formData.pcond_processual.value}
                    onChange={(event) => handleChange('pcond_processual', 'value', event.target.value)}
                    placeholder="Informe o PCOND real e a compatibilidade processual"
                    rows="5"
                    className={styles.textarea}
                    required
                  />
                </div>
              </div>
            </section>
          </div>

          {blockingReasons.length > 0 && (
            <div className={styles.blockingBanner}>
              <strong>Indicação bloqueada para este caso</strong>
              <ul className={styles.blockingList}>
                {blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}

          {isLoadingCaseDetails && (
            <p className={styles.helperText} style={{ marginTop: '14px' }}>
              Atualizando dados completos do caso...
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={styles.secondaryButton}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isLoadingOperators || operators.length === 0 || blockingReasons.length > 0}
              className={styles.primaryButton}
            >
              <FaCheckCircle />
              {isSubmitting ? 'Indicando...' : 'Indicar caso para acordo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndicationChecklistModal;
