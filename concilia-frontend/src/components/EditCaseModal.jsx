// src/components/EditCaseModal.jsx
// ATUALIZADO: Modal agora fecha ao clicar no fundo (overlay)

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Pipeline.module.css';
import { FaPencilAlt, FaRegCommentDots, FaTimes } from 'react-icons/fa';
import ChatPreview from './ChatPreview';

// --- Sub-componente HistoryItem (Sem alterações) ---
const HistoryItem = ({ entry }) => {
    const fieldTranslations = {
        case_number: 'Nº do Processo', status: 'Status', priority: 'Prioridade',
        description: 'Descrição', opposing_party: 'Autor', defendant: 'Réu',
        original_value: 'Valor de Alçada', agreement_value: 'Valor do Acordo', cause_value: 'Valor da Causa',
    };

    const renderChanges = () => {
        if (!entry.new_values) return null;
        return (
            <ul className={styles.historyChanges}>
                {Object.entries(entry.new_values).map(([key, newValue]) => {
                    const oldValue = entry.old_values ? entry.old_values[key] : 'N/A';
                    const fieldName = fieldTranslations[key] || key;
                    return (
                        <li key={key}>
                            <strong>{fieldName}:</strong> alterado de
                            <em>"{oldValue || 'vazio'}"</em> para <em>"{newValue || 'vazio'}"</em>
                        </li>
                    );
                })}
            </ul>
        );
    };

    if (entry.event_type === 'update') {
        return (
            <div className={`${styles.historyItem} ${styles.update}`}>
                <div className={styles.historyIcon}><FaPencilAlt /></div>
                <div className={styles.historyContent}>
                    <p className={styles.historyDescription}>O caso foi atualizado com as seguintes alterações:</p>
                    {renderChanges()}
                    <div className={styles.historyMeta}>
                        <span>Por: <strong>{entry.user?.name || 'Sistema'}</strong></span>
                        <span>Em: {new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.historyItem}>
            <div className={styles.historyIcon}><FaRegCommentDots /></div>
            <div className={styles.historyContent}>
                <p className={styles.historyDescription}>{entry.description}</p>
                <div className={styles.historyMeta}>
                    <span>Por: <strong>{entry.user?.name || 'Sistema'}</strong></span>
                    <span>Em: {new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                </div>
            </div>
        </div>
    );
};


// --- Sub-componente HistoryTab (Sem alterações) ---
const HistoryTab = ({ caseId }) => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newHistoryEntry, setNewHistoryEntry] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/cases/${caseId}/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(response.data);
            } catch (error) {
                console.error("Erro ao buscar histórico:", error);
            } finally {
                setLoading(false);
            }
        };
        if (caseId) fetchHistory();
    }, [caseId, token]);

    const handleAddHistory = async () => {
        if (newHistoryEntry.trim() === '') return;
        try {
            const response = await apiClient.post(`/cases/${caseId}/history`, {
                description: newHistoryEntry,
                event_type: 'note'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(prev => [response.data, ...prev]);
            setNewHistoryEntry('');
        } catch (error) {
            console.error("Erro ao adicionar histórico:", error);
            alert('Não foi possível adicionar a anotação.');
        }
    };

    if (loading) return <p>Carregando histórico...</p>;

    return (
        <div>
            <div className={styles.historyAdd}>
                <textarea
                    value={newHistoryEntry}
                    onChange={(e) => setNewHistoryEntry(e.target.value)}
                    placeholder="Adicionar uma nova anotação ao caso..."
                    rows="3"
                />
                <button onClick={handleAddHistory}>Adicionar Anotação</button>
            </div>
            <div className={styles.historyList}>
                {history.length > 0 ? (
                    history.map(entry => <HistoryItem key={entry.id} entry={entry} />)
                ) : (
                    <p>Nenhum histórico encontrado para este caso.</p>
                )}
            </div>
        </div>
    );
};


// --- Sub-componente DetailsTab (Sem alterações) ---
const DetailsTab = ({ formData, handleChange, handlePriorityChange, handleAddTag, handleRemoveTag, newTagText, setNewTagText, newTagColor, setNewTagColor, clients, lawyers }) => {
    const brazilianStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const actionObjects = ["Contrato de Empréstimo - Juros Abusivos", "Cartão de Crédito - Cobrança Indevida", "Financiamento Imobiliário - Revisional", "Conta Corrente - Tarifas Abusivas", "Consignado - Desconto Indevido", "Cheque Especial - Juros Excessivos", "Seguro - Cobrança Indevida", "CDC - Venda Casada"];
    const availableColors = ['#EF4444', '#F97316', '#FBBF24', ' #84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899'];
    
    return (
        <>
            <div className={styles.formSection} style={{ borderTop: 'none', paddingTop: 0 }}>
                <h3 className={styles.formSectionTitle}>Informações do Processo</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="case_number">Número do Processo</label>
                        <input className={styles.input} type="text" id="case_number" name="case_number" value={formData.case_number || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="action_object">Objeto da Ação</label>
                        <select className={styles.select} id="action_object" name="action_object" value={formData.action_object || ''} onChange={handleChange} required>
                            <option value="">Selecione o objeto da ação</option>
                            {actionObjects.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Partes Envolvidas</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="opposing_party">Autor</label>
                        <input className={styles.input} type="text" id="opposing_party" name="opposing_party" value={formData.opposing_party || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="defendant">Réu</label>
                        <input className={styles.input} type="text" id="defendant" name="defendant" value={formData.defendant || ''} onChange={handleChange} required />
                    </div>
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Informações Institucionais</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="client_id">Banco</label>
                        <select className={styles.select} id="client_id" name="client_id" value={formData.client_id || ''} onChange={handleChange} required>
                            <option value="">Selecione o banco</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="lawyer_id">Colaborador Responsável</label>
                        <select className={styles.select} id="lawyer_id" name="lawyer_id" value={formData.lawyer_id || ''} onChange={handleChange} required>
                            <option value="">Selecione o colaborador</option>
                            {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Localização e Contato</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="comarca">Comarca</label>
                        <input className={styles.input} type="text" id="comarca" name="comarca" value={formData.comarca || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="state">Estado</label>
                        <select className={styles.select} id="state" name="state" value={formData.state || ''} onChange={handleChange}>
                            <option value="">Selecione o estado</option>
                            {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="opposing_lawyer">Advogado Adverso</label>
                        <input className={styles.input} type="text" id="opposing_lawyer" name="opposing_lawyer" value={formData.opposing_lawyer || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="opposing_contact">Contato Adverso</label>
                        <input className={styles.input} type="text" id="opposing_contact" name="opposing_contact" value={formData.opposing_contact || ''} onChange={handleChange} />
                    </div>
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Valores</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="cause_value">Valor da Causa</label>
                        <input className={styles.input} type="number" step="0.01" id="cause_value" name="cause_value" value={formData.cause_value || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="original_value">Valor da Alçada</label>
                        <input className={styles.input} type="number" step="0.01" id="original_value" name="original_value" value={formData.original_value || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="agreement_value">Valor da Proposta de Acordo</label>
                        <input className={styles.input} type="number" step="0.01" id="agreement_value" name="agreement_value" value={formData.agreement_value || ''} onChange={handleChange} />
                    </div>
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Prioridade e Etiquetas</h3>
                <label className={styles.label}>Prioridade</label>
                <div className={styles.priorityButtons}>
                    <button type="button" className={`${styles.priorityButton} ${styles.alta} ${formData.priority === 'alta' ? styles.selected : ''}`} onClick={() => handlePriorityChange('alta')}>Alta</button>
                    <button type="button" className={`${styles.priorityButton} ${styles.media} ${formData.priority === 'media' ? styles.selected : ''}`} onClick={() => handlePriorityChange('media')}>Média</button>
                    <button type="button" className={`${styles.priorityButton} ${styles.baixa} ${formData.priority === 'baixa' ? styles.selected : ''}`} onClick={() => handlePriorityChange('baixa')}>Baixa</button>
                </div>
                <label className={styles.label}>Adicionar Etiqueta Personalizada</label>
                <div className={styles.tagCreator}>
                    <input type="text" className={styles.tagInput} value={newTagText} onChange={(e) => setNewTagText(e.target.value)} placeholder="Nome da nova etiqueta..." />
                    <button type="button" className={styles.addButton} onClick={handleAddTag}>+ Adicionar</button>
                </div>
                <div className={styles.colorPicker}>
                    {availableColors.map(color => (
                        <div key={color} className={`${styles.colorDot} ${newTagColor === color ? styles.selected : ''}`} style={{ backgroundColor: color }} onClick={() => setNewTagColor(color)} />
                    ))}
                </div>
                <div className={styles.tagList} style={{ marginTop: '1rem' }}>
                    {(formData.tags || []).map((tag, index) => (
                        <div key={index} className={styles.tagItem} style={{ backgroundColor: tag.color }}>
                            <span>{tag.text}</span>
                            <button type="button" className={styles.tagRemoveButton} onClick={() => handleRemoveTag(index)}>&times;</button>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Observações</h3>
                <div className={styles.formGroup}>
                    <textarea className={styles.input} name="description" value={formData.description || ''} onChange={handleChange} rows="4" placeholder="Adicione observações relevantes sobre o caso..."></textarea>
                </div>
            </div>
        </>
    );
};


// --- COMPONENTE PRINCIPAL: EditCaseModal (COM AS ALTERAÇÕES) ---
const EditCaseModal = ({ legalCase, onClose, onCaseUpdated, clients, lawyers }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [newTagText, setNewTagText] = useState('');
    const [newTagColor, setNewTagColor] = useState('#EF4444');
    
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (legalCase) {
            setFormData({
                ...legalCase,
                client_id: legalCase.client?.id || '',
                lawyer_id: legalCase.lawyer?.id || '',
            });
            setConversation(null);
            setMessages([]);
            setActiveTab('details');
        }
    }, [legalCase]);

    const fetchConversation = useCallback(async () => {
        if (!legalCase?.id) return;
        setChatLoading(true);
        try {
            const response = await apiClient.get(`/cases/${legalCase.id}/conversation`, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            setConversation(response.data.conversation);
            setMessages(response.data.messages || []);
        } catch (err) {
            console.error("Erro ao buscar conversa do caso:", err);
            setConversation(null);
            setMessages([]);
        } finally {
            setChatLoading(false);
        }
    }, [legalCase?.id, token]);

    useEffect(() => {
        if (activeTab === 'chat') {
            fetchConversation();
        }
    }, [activeTab, fetchConversation]);

    const handleSendMessage = async (content) => {
        if (!content.trim() || !conversation?.id) return;
        setIsSending(true);
        try {
            await apiClient.post(`/chat/conversations/${conversation.id}/messages`, { content }, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            fetchConversation();
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            alert('Não foi possível enviar a mensagem.');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prevState => ({ ...prevState, [name]: value })); };
    const handlePriorityChange = (priority) => { setFormData(prevState => ({ ...prevState, priority: priority })); };
    const handleAddTag = () => { if (newTagText.trim() === '') return; const newTag = { text: newTagText, color: newTagColor }; setFormData(prevState => ({ ...prevState, tags: [...(prevState.tags || []), newTag] })); setNewTagText(''); };
    const handleRemoveTag = (indexToRemove) => { setFormData(prevState => ({ ...prevState, tags: prevState.tags.filter((_, index) => index !== indexToRemove) })); };
    const handleSubmit = async (e) => { e.preventDefault(); setIsSubmitting(true); setError(''); try { await apiClient.put(`/cases/${legalCase.id}`, formData, { headers: { Authorization: `Bearer ${token}` } }); alert('Caso atualizado com sucesso!'); if (onCaseUpdated) { onCaseUpdated(); } onClose(); } catch (err) { console.error("Erro ao atualizar o caso:", err.response?.data); setError('Erro ao atualizar o caso. Verifique os campos.'); } finally { setIsSubmitting(false); } };

    if (!legalCase) {
        return null;
    }

    return (
        // ATUALIZADO: Adicionado onClick={onClose} ao overlay
        <div className={styles.modalOverlay} onClick={onClose}>
            {/* ATUALIZADO: Adicionado onClick com stopPropagation ao conteúdo */}
            <div 
                className={`${styles.modalContent} ${styles.large}`} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Processo #{formData.case_number}</h2>
                    <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                </div>

                <div className={styles.tabNav}>
                    <button className={`${styles.tabButton} ${activeTab === 'details' ? styles.active : ''}`} onClick={() => setActiveTab('details')}>Detalhes do Caso</button>
                    <button className={`${styles.tabButton} ${activeTab === 'chat' ? styles.active : ''}`} onClick={() => setActiveTab('chat')}>Comunicação</button>
                    <button className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`} onClick={() => setActiveTab('history')}>Histórico</button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'details' && (
                        <form onSubmit={handleSubmit}>
                            <DetailsTab formData={formData} handleChange={handleChange} handlePriorityChange={handlePriorityChange} handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag} newTagText={newTagText} setNewTagText={setNewTagText} newTagColor={newTagColor} setNewTagColor={setNewTagColor} clients={clients} lawyers={lawyers} />
                            {error && <p className={styles.error}>{error}</p>}
                            <div className={styles.actions}> <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button> <button type="submit" className={styles.saveButton} disabled={isSubmitting}> {isSubmitting ? 'Salvando...' : 'Salvar Alterações'} </button> </div>
                        </form>
                    )}

                    {activeTab === 'chat' && (
                        <div className={styles.chatColumn}>
                            {chatLoading ? (
                                <p>Carregando conversa...</p>
                            ) : conversation ? (
                                <ChatPreview
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isSending={isSending}
                                    isInteractive={true}
                                    contactName={legalCase.opposing_party}
                                    contactNumber={legalCase.opposing_contact}
                                />
                            ) : (
                                <p>Nenhuma conversa vinculada a este caso.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <HistoryTab caseId={legalCase.id} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditCaseModal;