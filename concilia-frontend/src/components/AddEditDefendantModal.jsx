import React, { useState } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Modal.module.css';

const AddEditDefendantModal = ({ onClose, onSuccess, initialName = '' }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        name: initialName,
        cnpj: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/defendants', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess(response.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar réu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Cadastrar Réu (Empresa)</h2>
                    <button type="button" onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>
                {error && <div className={styles.errorBanner}>{error}</div>}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Razão Social / Nome *</label>
                        <input className={styles.input} type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>CNPJ</label>
                        <input className={styles.input} type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="Apenas números" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Telefone (Opcional)</label>
                        <input className={styles.input} type="text" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                        <button type="submit" disabled={loading} className={styles.saveButton}>
                            {loading ? 'Salvando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditDefendantModal;