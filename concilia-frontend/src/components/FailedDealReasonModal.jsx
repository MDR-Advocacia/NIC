import React, { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/Pipeline.module.css';
import SearchableReasonSelect from './SearchableReasonSelect';

const FailedDealReasonModal = ({
  caseNumber,
  selectedCount,
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
    apiClient.get('/failed-deal-reasons')
      .then((res) => setPredefinedReasons(res.data?.data || res.data || []))
      .catch(() => setPredefinedReasons([]))
      .finally(() => setLoadingReasons(false));
  }, []);

  const title = selectedCount
    ? `Frustrar acordo de ${selectedCount} ${selectedCount === 1 ? 'caso' : 'casos'}`
    : 'Acordo frustrado';

  const subtitle = selectedCount
    ? 'Informe uma justificativa única para os casos selecionados.'
    : `Processo ${caseNumber || 'selecionado'}`;

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
            <FaExclamationTriangle />
          </span>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            <p className={styles.statusReasonSubtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="failed-deal-reason-select">
            Motivo do acordo frustrado *
          </label>
          <SearchableReasonSelect
            id="failed-deal-reason-select"
            options={predefinedReasons}
            value={reason}
            onChange={onReasonChange}
            placeholder="Selecione um motivo"
            loading={loadingReasons}
          />
          <span className={styles.inputDescription}>
            Essa justificativa ficará registrada no caso para consulta da equipe.
          </span>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className={styles.saveButton} disabled={isSubmitting || loadingReasons}>
            {isSubmitting ? 'Salvando...' : 'Salvar acordo frustrado'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FailedDealReasonModal;
