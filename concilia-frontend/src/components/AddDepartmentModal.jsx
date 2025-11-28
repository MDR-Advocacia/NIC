// src/components/AddDepartmentModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/AggressorLawyersModal.module.css';
import formStyles from '../styles/Form.module.css';
import { FaTimes } from 'react-icons/fa';

const AddDepartmentModal = ({ isOpen, onClose, onSave }) => {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            await apiClient.post('/departments', { name }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSave(); // Avisa a página principal que salvou com sucesso
            setName(''); // Limpa o campo
        } catch (err) {
            setError(err.response?.data?.message || 'Não foi possível salvar o departamento.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${formStyles.formModalContent}`} style={{maxWidth: '500px'}}>
                <div className={styles.modalHeader}>
                    <h2>Adicionar Novo Departamento</h2>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit}>
                        <div className={formStyles.formGroup}>
                            <label htmlFor="name">Nome do Departamento *</label>
                            <input 
                                type="text" 
                                id="name" 
                                name="name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required 
                            />
                        </div>
                        
                        {error && <p className={formStyles.error}>{error}</p>}
                        
                        <div className={formStyles.formActions}>
                            <button type="button" onClick={onClose} className={formStyles.cancelButton}>Cancelar</button>
                            <button type="submit" className={formStyles.saveButton} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddDepartmentModal;