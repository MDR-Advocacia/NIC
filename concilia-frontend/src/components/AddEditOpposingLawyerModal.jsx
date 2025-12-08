import React, { useState } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Modal.module.css';

const AddEditOpposingLawyerModal = ({ onClose, onSuccess, initialName = '' }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        name: initialName,
        cpf: '',
        oab: '',
        phone: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/opposing-lawyers', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess(response.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar advogado. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Cadastrar Advogado Adverso</h2>
                    <button type="button" onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>
                
                {error && <div className={styles.errorBanner}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nome Completo *</label>
                        <input className={styles.input} type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>CPF</label>
                            <input className={styles.input} type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>OAB</label>
                            <input className={styles.input} type="text" name="oab" value={formData.oab} onChange={handleChange} />
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>Telefone</label>
                            <input className={styles.input} type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input className={styles.input} type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>
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

export default AddEditOpposingLawyerModal;