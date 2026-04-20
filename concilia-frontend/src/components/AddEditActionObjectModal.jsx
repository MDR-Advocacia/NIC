import React, { useState } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Modal.module.css';

const AddEditActionObjectModal = ({
  onClose,
  onSuccess,
  initialName = '',
  actionObject = null,
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: actionObject?.name || initialName,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
      };

      const response = actionObject
        ? await apiClient.put(`/action-objects/${actionObject.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await apiClient.post('/action-objects', payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar causa de pedir:', err);
      setError('Não foi possível salvar essa causa de pedir. Verifique se ela já não existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{actionObject ? 'Editar Causa de Pedir' : 'Cadastrar Causa de Pedir'}</h2>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nome *</label>
            <input
              className={styles.input}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Revisão contratual"
            />
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.saveButton}>
              {loading ? 'Salvando...' : actionObject ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditActionObjectModal;
