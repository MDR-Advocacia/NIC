import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import styles from '../styles/Pipeline.module.css';

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
          <label className={styles.label} htmlFor="failed-deal-reason">
            Motivo do acordo frustrado *
          </label>
          <textarea
            id="failed-deal-reason"
            className={styles.textarea}
            rows={6}
            maxLength={4000}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Descreva objetivamente por que o acordo foi frustrado."
            autoFocus
            required
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
          <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar acordo frustrado'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FailedDealReasonModal;
