// src/components/AddEditLitigantModal.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api'; // Ajuste o import conforme sua estrutura
import styles from '../styles/Modal.module.css'; // Usando estilos genéricos de modal se houver, ou crie um novo CSS

const AddEditLitigantModal = ({ isOpen, onClose, litigantToEdit, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'PF', // PF ou PJ
    doc_number: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (litigantToEdit) {
      setFormData({
        name: litigantToEdit.name || '',
        type: litigantToEdit.type || 'PF',
        doc_number: litigantToEdit.doc_number || '',
        email: litigantToEdit.email || '',
        phone: litigantToEdit.phone || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'PF',
        doc_number: '',
        email: '',
        phone: ''
      });
    }
    setError('');
  }, [litigantToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (litigantToEdit) {
        await apiClient.put(`/litigants/${litigantToEdit.id}`, formData);
      } else {
        await apiClient.post('/litigants', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar parte. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h2 className={styles.modalTitle}>
          {litigantToEdit ? 'Editar Parte (Litigante)' : 'Nova Parte (Litigante)'}
        </h2>
        
        {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Nome Completo *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              className={styles.input}
              placeholder="Ex: João da Silva ou Empresa X Ltda"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className={styles.formGroup}>
              <label>Tipo Pessoa</label>
              <select 
                name="type" 
                value={formData.type} 
                onChange={handleChange} 
                className={styles.select}
              >
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>CPF / CNPJ</label>
              <input 
                type="text" 
                name="doc_number" 
                value={formData.doc_number} 
                onChange={handleChange} 
                className={styles.input}
                placeholder="Apenas números"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
             <div className={styles.formGroup}>
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Telefone</label>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className={styles.input}
                  placeholder="(00) 00000-0000"
                />
              </div>
          </div>

          <div className={styles.modalActions} style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" disabled={loading} className={styles.saveButton}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditLitigantModal;