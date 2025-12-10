// src/components/AddEditOpposingLawyerModal.jsx
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

    // --- MÁSCARAS DE ENTRADA ---

    const formatCPF = (value) => {
        // Remove tudo o que não é dígito e limita a 11 números
        let v = value.replace(/\D/g, '').slice(0, 11);
        
        // Aplica a máscara: 000.000.000-00
        if (v.length > 9) {
            v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        } else if (v.length > 6) {
            v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        } else if (v.length > 3) {
            v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        }
        return v;
    };

    const formatPhone = (value) => {
        // Remove tudo o que não é dígito e limita a 11 números (DDD + 9 dígitos)
        let v = value.replace(/\D/g, '').slice(0, 11);

        // Aplica a máscara: (00) 00000-0000
        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (v.length > 6) {
            v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
        } else if (v.length > 0) {
            v = v.replace(/^(\d*)/, '($1');
        }
        return v;
    };

    const isValidEmail = (email) => {
        // Regex simples para validação de email
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        let { name, value } = e.target;

        // Aplica as máscaras conforme o campo
        if (name === 'cpf') {
            value = formatCPF(value);
        } else if (name === 'phone') {
            value = formatPhone(value);
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validação de E-mail antes de enviar
        if (formData.email && !isValidEmail(formData.email)) {
            setError('Por favor, insira um e-mail válido (ex: nome@dominio.com).');
            setLoading(false);
            return;
        }

        // Validação básica de CPF (apenas tamanho, já que a máscara garante formato)
        if (formData.cpf && formData.cpf.length < 14) {
            setError('O CPF está incompleto.');
            setLoading(false);
            return;
        }

        try {
            const response = await apiClient.post('/opposing-lawyers', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess(response.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar advogado. Verifique se o CPF ou OAB já não estão cadastrados.');
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
                        <label className={styles.label}>Nome Completo *</label>
                        <input 
                            className={styles.input} 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            placeholder="Nome do advogado"
                        />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>CPF</label>
                            <input 
                                className={styles.input} 
                                type="text" 
                                name="cpf" 
                                value={formData.cpf} 
                                onChange={handleChange} 
                                placeholder="000.000.000-00" 
                                maxLength={14} // 11 números + 3 símbolos
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>OAB/UF</label>
                            <input 
                                className={styles.input} 
                                type="text" 
                                name="oab" 
                                value={formData.oab} 
                                onChange={handleChange} 
                                placeholder="Ex: 123456/SP"
                            />
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Telefone</label>
                            <input 
                                className={styles.input} 
                                type="text" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                placeholder="(00) 00000-0000" 
                                maxLength={15} // (11) 12345-6789
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email</label>
                            <input 
                                className={styles.input} 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                placeholder="email@exemplo.com"
                            />
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