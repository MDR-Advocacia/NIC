import React, { useState, useEffect } from 'react'; // Importar useEffect
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/AggressorLawyersModal.module.css';
import formStyles from '../styles/Form.module.css';
import { FaTimes } from 'react-icons/fa';

const AddEditAggressorModal = ({ isOpen, onClose, onSave, clients, existingLawyer }) => {
    const { token } = useAuth();
    const initialState = {
        name: '', oab: '', cpf: '',
        demands_quantity: 0, observations: '',
        status: 'active', client_ids: [],
    };

    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // 1. EFEITO PARA PREENCHER O FORMULÁRIO EM MODO DE EDIÇÃO
    useEffect(() => {
        if (existingLawyer) {
            // Se estamos editando, preenchemos o formulário com os dados existentes
            setFormData({
                name: existingLawyer.name || '',
                oab: existingLawyer.oab || '',
                cpf: existingLawyer.cpf || '',
                demands_quantity: existingLawyer.demands_quantity || 0,
                observations: existingLawyer.observations || '',
                status: existingLawyer.status || 'active',
                // Extrai apenas os IDs dos clientes para marcar os checkboxes
                client_ids: existingLawyer.clients ? existingLawyer.clients.map(c => c.id) : [],
            });
        } else {
            // Se estamos adicionando, garantimos que o formulário esteja limpo
            setFormData(initialState);
        }
    }, [existingLawyer, isOpen]); // Roda sempre que o advogado em edição ou o estado de abertura mudar

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        const clientId = parseInt(value, 10);
        setFormData(prev => {
            const currentClientIds = prev.client_ids || [];
            if (checked) {
                return { ...prev, client_ids: [...currentClientIds, clientId] };
            } else {
                return { ...prev, client_ids: currentClientIds.filter(id => id !== clientId) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (existingLawyer) {
                // 2. MODO EDIÇÃO: Requisição PUT para atualizar
                await apiClient.put(`/aggressor-lawyers/${existingLawyer.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // 3. MODO ADIÇÃO: Requisição POST para criar
                await apiClient.post('/aggressor-lawyers', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSave();
            setFormData(initialState);
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
                    <h2>{existingLawyer ? 'Editar' : 'Adicionar'} Advogado Agressor</h2>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit}>
                        {/* ... campos do formulário ... */}
                        <div className={formStyles.formGrid}>
                            <div className={formStyles.formGroup} style={{ gridColumn: '1 / span 2' }}>
                                <label htmlFor="name">Nome Completo *</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="oab">OAB</label>
                                <input type="text" id="oab" name="oab" value={formData.oab} onChange={handleChange} />
                            </div>
                             <div className={formStyles.formGroup}>
                                <label htmlFor="cpf">CPF</label>
                                <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="demands_quantity">Quantidade de Demandas</label>
                                <input type="number" id="demands_quantity" name="demands_quantity" value={formData.demands_quantity} onChange={handleChange} />
                            </div>
                        </div>

                        <div className={formStyles.formGroup}>
                            <label>Bancos Afetados *</label>
                            <div className={formStyles.checkboxGroup}>
                                {clients && clients.map(client => (
                                    <div key={client.id} className={formStyles.checkboxItem}>
                                        <input type="checkbox" id={`client-${client.id}`} name="client_ids" value={client.id}
                                            checked={formData.client_ids.includes(client.id)} // Marca o checkbox se o ID estiver na lista
                                            onChange={handleCheckboxChange} />
                                        <label htmlFor={`client-${client.id}`}>{client.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* ... resto dos campos e botões ... */}
                         <div className={formStyles.formGroup}>
                            <label htmlFor="observations">Observações</label>
                            <textarea id="observations" name="observations" rows="4" value={formData.observations} onChange={handleChange}></textarea>
                        </div>
                        
                        <div className={formStyles.formGroup}>
                            <label htmlFor="status">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>
                        
                        {error && <p className={formStyles.error}>{error}</p>}
                        
                        <div className={formStyles.formActions}>
                            <button type="button" onClick={onClose} className={formStyles.cancelButton}>Cancelar</button>
                            {/* 5. TEXTO DO BOTÃO DINÂMICO */}
                            <button type="submit" className={formStyles.saveButton} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (existingLawyer ? 'Salvar Alterações' : 'Adicionar')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddEditAggressorModal;