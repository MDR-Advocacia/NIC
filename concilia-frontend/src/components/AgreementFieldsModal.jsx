import React from 'react';
import { FaHandshake, FaTimes } from 'react-icons/fa';
import styles from '../styles/Pipeline.module.css';

const AgreementFieldsModal = ({
  caseNumber,
  agreementValue,
  onValueChange,
  agreementClosedAt,
  onDateChange,
  error,
  isSubmitting = false,
  onCancel,
  onConfirm,
}) => {
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
          <span className={styles.statusReasonIcon} style={{ color: '#38B2AC' }}>
            <FaHandshake />
          </span>
          <div>
            <h2 className={styles.modalTitle}>Dados do acordo</h2>
            <p className={styles.statusReasonSubtitle}>
              Processo {caseNumber || 'selecionado'}
            </p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="agreement-value">
            Valor do acordo (R$) *
          </label>
          <input
            id="agreement-value"
            type="number"
            step="0.01"
            min="0.01"
            className={styles.textarea}
            style={{ minHeight: 'auto', resize: 'none', padding: '0.6rem 0.75rem' }}
            value={agreementValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Ex: 15000.00"
            autoFocus
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="agreement-closed-at">
            Data do acordo *
          </label>
          <input
            id="agreement-closed-at"
            type="date"
            className={styles.textarea}
            style={{ minHeight: 'auto', resize: 'none', padding: '0.6rem 0.75rem' }}
            value={agreementClosedAt}
            onChange={(e) => onDateChange(e.target.value)}
            required
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Confirmar acordo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgreementFieldsModal;
