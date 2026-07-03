import React, { useEffect, useState } from 'react';
import { FaRedo, FaTimes } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/Pipeline.module.css';
import SearchableReasonSelect from './SearchableReasonSelect';

const ReanalysisReasonModal = ({
  caseNumber,
  reason,
  onReasonChange,
  error,
  isSubmitting = false,
  onCancel,
  onConfirm,
}) => {
  const [predefinedReasons, setPredefinedReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(true);

  useEffect(() => {
    apiClient.get('/reanalysis-reasons')
      .then((res) => setPredefinedReasons(res.data?.data || res.data || []))
      .catch(() => setPredefinedReasons([]))
      .finally(() => setLoadingReasons(false));
  }, []);

  return (
    <div className={styles.modalOverlay} role="presentation">
      <form className={`${styles.modalContent} ${styles.statusReasonModal}`} onSubmit={onConfirm}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Fechar"
        >
          <FaTimes />
        </button>

        <div className={styles.statusReasonHeader}>
          <span className={styles.statusReasonIcon}>
            <FaRedo />
          </span>
          <div>
            <h2 className={styles.modalTitle}>Solicitar reanálise</h2>
            <p className={styles.statusReasonSubtitle}>Processo {caseNumber || 'selecionado'}</p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="reanalysis-reason-select">
            Motivo da reanálise *
          </label>
          <SearchableReasonSelect
            id="reanalysis-reason-select"
            options={predefinedReasons}
            value={reason}
            onChange={onReasonChange}
            placeholder="Selecione um motivo"
            loading={loadingReasons}
          />
          <span className={styles.inputDescription}>
            O caso voltará para Análise Inicial, ficará vinculado a você como indicador e essa justificativa ficará registrada.
          </span>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className={styles.saveButton} disabled={isSubmitting || loadingReasons}>
            {isSubmitting ? 'Solicitando...' : 'Solicitar reanálise'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReanalysisReasonModal;
