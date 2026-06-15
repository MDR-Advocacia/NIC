import React, { useState, useEffect } from 'react';
import { FaHandshake, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/FormalizeAgreement.module.css';

const FormalizeAgreementModal = ({ caseNumber, onCancel, onConfirm, isSubmitting = false }) => {
  const { token, user } = useAuth();
  const [indicators, setIndicators] = useState([]);
  const [loadingIndicators, setLoadingIndicators] = useState(true);
  const [formData, setFormData] = useState({
    indicator_id: '',
    hearing_date: '',
    agreement_value: '',
    has_obligation: false,
    obligation_description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const res = await apiClient.get('/users/indicators', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setIndicators(list);
        if (user?.id) {
          const match = list.find(i => i.id === user.id);
          if (match) {
            setFormData(prev => ({ ...prev, indicator_id: String(match.id) }));
          }
        }
      } catch {
        setIndicators([]);
      } finally {
        setLoadingIndicators(false);
      }
    };
    fetchIndicators();
  }, [token, user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const getSelectedIndicatorName = () => {
    const found = indicators.find(i => String(i.id) === formData.indicator_id);
    return found ? found.name : '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.indicator_id) {
      setError('Selecione o indicador que fechou o acordo.');
      return;
    }
    if (!formData.hearing_date) {
      setError('Informe a data da audiência.');
      return;
    }
    if (!formData.agreement_value || parseFloat(formData.agreement_value) <= 0) {
      setError('Informe o valor do acordo.');
      return;
    }
    if (formData.has_obligation && !formData.obligation_description.trim()) {
      setError('Descreva a obrigação de fazer.');
      return;
    }
    onConfirm({
      formalized_by_name: getSelectedIndicatorName(),
      formalized_by_indicator_id: parseInt(formData.indicator_id, 10),
      hearing_date: formData.hearing_date,
      agreement_value: parseFloat(formData.agreement_value),
      has_obligation: formData.has_obligation,
      obligation_description: formData.obligation_description,
    });
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <button type="button" className={styles.closeBtn} onClick={onCancel} disabled={isSubmitting}>
          <FaTimes />
        </button>

        <div className={styles.header}>
          <span className={styles.icon}><FaHandshake /></span>
          <div>
            <h2 className={styles.title}>Formalizar Acordo em Audiência</h2>
            <p className={styles.subtitle}>Processo {caseNumber || ''}</p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="indicator_id">
            Indicador que fechou o acordo *
          </label>
          {loadingIndicators ? (
            <p className={styles.loadingText}>Carregando indicadores...</p>
          ) : (
            <select
              id="indicator_id"
              className={styles.select}
              value={formData.indicator_id}
              onChange={(e) => handleChange('indicator_id', e.target.value)}
              required
            >
              <option value="">Selecione o indicador</option>
              {indicators.map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="hearing_date">
            Data da audiência *
          </label>
          <input
            id="hearing_date"
            type="date"
            className={styles.input}
            value={formData.hearing_date}
            onChange={(e) => handleChange('hearing_date', e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="agreement_value">
            Valor do acordo (R$) *
          </label>
          <input
            id="agreement_value"
            type="number"
            step="0.01"
            min="0"
            className={styles.input}
            value={formData.agreement_value}
            onChange={(e) => handleChange('agreement_value', e.target.value)}
            placeholder="0,00"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Obrigação de fazer?</label>
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${!formData.has_obligation ? styles.toggleActive : ''}`}
              onClick={() => handleChange('has_obligation', false)}
            >
              Não
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${formData.has_obligation ? styles.toggleActive : ''}`}
              onClick={() => handleChange('has_obligation', true)}
            >
              Sim
            </button>
          </div>
        </div>

        {formData.has_obligation && (
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="obligation_description">
              Descreva a obrigação *
            </label>
            <textarea
              id="obligation_description"
              className={styles.textarea}
              rows={4}
              maxLength={4000}
              value={formData.obligation_description}
              onChange={(e) => handleChange('obligation_description', e.target.value)}
              placeholder="Descreva a obrigação de fazer acordada na audiência."
              required
            />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className={styles.confirmBtn} disabled={isSubmitting || loadingIndicators}>
            {isSubmitting ? 'Salvando...' : 'Formalizar Acordo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormalizeAgreementModal;
