import React from 'react';
import { FaRedo, FaTimes } from 'react-icons/fa';
import styles from '../styles/Pipeline.module.css';

const ReanalysisReasonModal = ({
  caseNumber,
  reason,
  onReasonChange,
  error,
  isSubmitting = false,
  onCancel,
  onConfirm,
}) => (
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
        <label className={styles.label} htmlFor="reanalysis-reason">
          Motivo da reanálise *
        </label>
        <textarea
          id="reanalysis-reason"
          className={styles.textarea}
          rows={6}
          maxLength={4000}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Descreva objetivamente por que o caso deve voltar para análise."
          autoFocus
          required
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
        <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
          {isSubmitting ? 'Solicitando...' : 'Solicitar reanálise'}
        </button>
      </div>
    </form>
  </div>
);

export default ReanalysisReasonModal;
