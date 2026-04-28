import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/AggressorLawyersModal.module.css';
import formStyles from '../styles/Form.module.css';
import { FaTimes } from 'react-icons/fa';

const INITIAL_STATE = {
    name: '', email: '', phone: '', password: '',
    department_id: '', role: 'operador', status: 'ativo',
};

const AddEditUserModal = ({ isOpen, onClose, onSave, departments, existingUser }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // 1. EFEITO PARA PREENCHER O FORMULÁRIO EM MODO DE EDIÇÃO
    useEffect(() => {
        if (existingUser) {
            // Se estamos editando, preenchemos o formulário com os dados existentes
            setFormData({
                name: existingUser.name || '',
                email: existingUser.email || '',
                phone: existingUser.phone || '',
                password: '', // Deixa a senha em branco por segurança na edição
                department_id: existingUser.department_id || '',
                role: existingUser.role || 'operador',
                status: existingUser.status || 'ativo',
            });
        } else {
            // Se estamos adicionando, garantimos que o formulário esteja limpo
            setFormData(INITIAL_STATE);
        }
    }, [existingUser, isOpen]); // Roda sempre que o usuário em edição ou o estado de abertura mudar

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        
        // Remove a senha do objeto de dados se ela estiver vazia
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
            delete dataToSend.password;
        }

        try {
            if (existingUser) {
                // 2. MODO EDIÇÃO: Requisição PUT para atualizar
                await apiClient.put(`/users/${existingUser.id}`, dataToSend, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // 3. MODO ADIÇÃO: Requisição POST para criar
                await apiClient.post('/users', dataToSend, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSave();
            setFormData(INITIAL_STATE);
        } catch (err) {
            const apiError = err.response?.data?.message || 'Ocorreu um erro.';
            setError(apiError);
            console.error("Erro ao salvar:", err.response?.data);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${formStyles.formModalContent}`}>
                <div className={styles.modalHeader}>
                    {/* 4. TÍTULO DINÂMICO */}
                    <h2>{existingUser ? 'Editar' : 'Adicionar'} Usuário</h2>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit}>
                        <div className={formStyles.formGrid}>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="name">Nome Completo *</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="email">Email *</label>
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="phone">Telefone</label>
                                <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            {existingUser && (
                                <div className={formStyles.formGroup}>
                                    <label htmlFor="password">Senha (Deixe em branco para não alterar)</label>
                                    <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} />
                                </div>
                            )}
                             <div className={formStyles.formGroup}>
                                <label htmlFor="department_id">Departamento *</label>
                                <select id="department_id" name="department_id" value={formData.department_id} onChange={handleChange} required>
                                    <option value="">Selecione um departamento</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="role">Função *</label>
                                <select id="role" name="role" value={formData.role} onChange={handleChange} required>
                                    <option value="operador">Operador</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="administrador">Administrador</option>
                                    <option value="indicador">Indicador</option>
                                </select>
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="status">Status *</label>
                                <select id="status" name="status" value={formData.status} onChange={handleChange} required>
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                            </div>
                        </div>
                        
                        {error && <p className={formStyles.error}>{error}</p>}
                        
                        <div className={formStyles.formActions}>
                            <button type="button" onClick={onClose} className={formStyles.cancelButton}>Cancelar</button>
                            {/* 5. TEXTO DO BOTÃO DINÂMICO */}
                            <button type="submit" className={formStyles.saveButton} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (existingUser ? 'Salvar Alterações' : 'Adicionar')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddEditUserModal;
