// src/components/EditCaseModal.jsx
// ATUALIZADO: Com busca de Litigantes Abusivos (Lupa) e novos campos

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Pipeline.module.css';
import { FaPencilAlt, FaRegCommentDots, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import ChatPreview from './ChatPreview';
import AgreementChecklist from './AgreementChecklist';
import AddEditOpposingLawyerModal from './AddEditOpposingLawyerModal';
import OpposingLawyerListModal from './OpposingLawyerListModal'; // <--- IMPORT NOVO

// --- Ícones SVG Inline ---
const IconBriefcase = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#4299e1'}}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#ed8936'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDollar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#48bb78'}}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconMap = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#ecc94b'}}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IconChecklist = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#9f7aea'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTag = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#f56565'}}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconTie = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#38b2ac'}}><path d="M6 3L12 21L18 3"/><path d="M6 3H18"/></svg>;
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

// --- Sub-componente HistoryItem ---
const HistoryItem = ({ entry }) => {
    const fieldTranslations = {
        case_number: 'Nº do Processo', status: 'Status', priority: 'Prioridade',
        description: 'Descrição', opposing_party: 'Autor', defendant: 'Réu',
        original_value: 'Valor de Alçada', agreement_value: 'Valor do Acordo', cause_value: 'Valor da Causa',
        internal_number: 'Nº Interno', city: 'Cidade', pcond_probability: 'PCOND', updated_condemnation_value: 'Condenação Atualizada'
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
                            <strong>{fieldName}:</strong> de <em>"{oldValue || 'vazio'}"</em> para <em>"{newValue || 'vazio'}"</em>
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
                    <p className={styles.historyDescription}>Alterações realizadas:</p>
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

// --- Sub-componente HistoryTab ---
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

// --- Sub-componente DetailsTab (ATUALIZADO) ---
const DetailsTab = ({ 
    formData, 
    handleChange, 
    handlePriorityChange, 
    handleAddTag, 
    handleRemoveTag, 
    newTagText, 
    setNewTagText, 
    newTagColor, 
    setNewTagColor, 
    clients, 
    lawyers, 
    handleChecklistChange,
    // Props para o Advogado Adverso
    opposingLawyersList,
    lawyerSearchTerm,
    setLawyerSearchTerm,
    showLawyerDropdown,
    setShowLawyerDropdown,
    handleSelectLawyer,
    handleCreateLawyer,
    handleOpenListModal // Nova prop
}) => {
    const brazilianStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const actionObjects = ["Contrato de Empréstimo - Juros Abusivos", "Cartão de Crédito - Cobrança Indevida", "Financiamento Imobiliário - Revisional", "Conta Corrente - Tarifas Abusivas", "Consignado - Desconto Indevido", "Cheque Especial - Juros Excessivos", "Seguro - Cobrança Indevida", "CDC - Venda Casada", "Outros"];
    const availableColors = ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899'];
    
    // Filtro local para o dropdown
    const filteredLawyers = opposingLawyersList.filter(l => 
        l.name.toLowerCase().includes(lawyerSearchTerm.toLowerCase()) || 
        (l.oab && l.oab.toLowerCase().includes(lawyerSearchTerm.toLowerCase()))
    );

    const headerStyle = { display: 'flex', alignItems: 'center', gap: '10px' };

    // Verifica se é abusivo para mudar cor
    const isAbusive = formData.opposing_lawyer_id && opposingLawyersList.find(l => l.id === formData.opposing_lawyer_id)?.is_abusive;

    // Estilos inline para o dropdown (Dark Mode)
    const dropdownStyle = {
        position: 'absolute', top: '100%', left: 0, right: 0, 
        backgroundColor: '#2d3748', border: '1px solid #4a5568', 
        zIndex: 50, listStyle: 'none', padding: 0, margin: 0, 
        maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        borderRadius: '0 0 6px 6px'
    };
    
    const itemStyle = {
        padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #4a5568', color: '#f7fafc'
    };

    return (
        <>
            <div className={styles.formSection} style={{ borderTop: 'none', paddingTop: 0 }}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconBriefcase /> Informações do Processo
                </h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Número do Processo</label>
                        <input className={styles.input} type="text" name="case_number" value={formData.case_number || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Número Interno</label>
                        <input className={styles.input} type="text" name="internal_number" value={formData.internal_number || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Objeto da Ação</label>
                        <select className={styles.select} name="action_object" value={formData.action_object || ''} onChange={handleChange} required>
                            <option value="">Selecione...</option>
                            {actionObjects.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Data Distribuição</label>
                        <input className={styles.input} type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconUsers /> Partes Envolvidas
                </h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Autor</label>
                        <input className={styles.input} type="text" name="opposing_party" value={formData.opposing_party || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Réu</label>
                        <input className={styles.input} type="text" name="defendant" value={formData.defendant || ''} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Banco</label>
                        <select className={styles.select} name="client_id" value={formData.client_id || ''} onChange={handleChange} required>
                            <option value="">Selecione...</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Colaborador</label>
                        <select className={styles.select} name="lawyer_id" value={formData.lawyer_id || ''} onChange={handleChange} required>
                            <option value="">Selecione...</option>
                            {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconMap /> Localização
                </h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Comarca</label>
                        <input className={styles.input} type="text" name="comarca" value={formData.comarca || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Cidade</label>
                        <input className={styles.input} type="text" name="city" value={formData.city || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Estado</label>
                        <select className={styles.select} name="state" value={formData.state || ''} onChange={handleChange}>
                            <option value="">UF</option>
                            {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Juizado Especial?</label>
                        <select className={styles.select} name="special_court" value={formData.special_court || 'Não'} onChange={handleChange}>
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconTie /> Advogado Adverso
                </h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} style={isAbusive ? {color: '#e53e3e', fontWeight:'bold'} : {}}>
                            Nome {isAbusive && '(LITIGANTE ABUSIVO)'}
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input 
                                    className={styles.input} 
                                    type="text" 
                                    name="opposing_lawyer" 
                                    value={formData.opposing_lawyer || ''} 
                                    onChange={(e) => {
                                        setLawyerSearchTerm(e.target.value);
                                        setShowLawyerDropdown(true);
                                        if (e.target.value === '') handleChange({ target: { name: 'opposing_lawyer_id', value: '' }});
                                        handleChange(e); 
                                    }}
                                    onFocus={() => setShowLawyerDropdown(true)}
                                    placeholder="Nome ou OAB..."
                                    autoComplete="off"
                                    style={isAbusive ? { borderColor: '#e53e3e', color: '#e53e3e', fontWeight: 'bold' } : {}}
                                />
                                
                                {showLawyerDropdown && lawyerSearchTerm && (
                                    <ul style={dropdownStyle}>
                                        {filteredLawyers.map(l => (
                                            <li key={l.id} 
                                                style={itemStyle}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#4a5568'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                onClick={() => handleSelectLawyer(l)}
                                            >
                                                <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                    {l.is_abusive && <FaExclamationTriangle color="#e53e3e" />}
                                                    <strong>{l.name}</strong> <small style={{color: '#a0aec0'}}>({l.oab || 'S/ OAB'})</small>
                                                </div>
                                            </li>
                                        ))}
                                        <li 
                                            style={{ ...itemStyle, backgroundColor: '#2a4365', color: '#90cdf4', fontWeight: 'bold' }}
                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#2b6cb0'; e.target.style.color = 'white'; }}
                                            onMouseLeave={(e) => { e.target.style.backgroundColor = '#2a4365'; e.target.style.color = '#90cdf4'; }}
                                            onClick={handleCreateLawyer}
                                        >
                                            <IconPlus /> Cadastrar Novo: "{lawyerSearchTerm}"
                                        </li>
                                    </ul>
                                )}
                                {showLawyerDropdown && (
                                    <div style={{position: 'fixed', inset:0, zIndex: 40}} onClick={() => setShowLawyerDropdown(false)} />
                                )}
                            </div>
                            
                            {/* BOTÃO LUPA (LISTA) */}
                            <button 
                                type="button" 
                                onClick={handleOpenListModal}
                                title="Buscar e Gerenciar Litigantes"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#4a5568', color: 'white', border: 'none',
                                    borderRadius: '4px', width: '42px', height: '42px', cursor: 'pointer'
                                }}
                            >
                                <IconSearch />
                            </button>

                            {/* BOTÃO ADICIONAR (+) */}
                            <button 
                                type="button" 
                                onClick={handleCreateLawyer}
                                title="Cadastrar Novo Advogado"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#3182ce', color: 'white', border: 'none',
                                    borderRadius: '4px', width: '42px', height: '42px', cursor: 'pointer'
                                }}
                            >
                                <IconPlus />
                            </button>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contato</label>
                        <input className={styles.input} type="text" name="opposing_contact" value={formData.opposing_contact || ''} readOnly placeholder="Automático" />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconDollar /> Valores e Risco
                </h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Valor da Causa (R$)</label>
                        <input className={styles.input} type="number" step="0.01" name="cause_value" value={formData.cause_value || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Valor de Alçada (R$)</label>
                        <input className={styles.input} type="number" step="0.01" name="original_value" value={formData.original_value || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Proposta Acordo (R$)</label>
                        <input className={styles.input} type="number" step="0.01" name="agreement_value" value={formData.agreement_value || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Condenação Atual (R$)</label>
                        <input className={styles.input} type="number" step="0.01" name="updated_condemnation_value" value={formData.updated_condemnation_value || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>PCOND (%)</label>
                        <input className={styles.input} type="number" step="0.01" max="100" name="pcond_probability" value={formData.pcond_probability || ''} onChange={handleChange} placeholder="0-100" />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconTag /> Prioridade e Etiquetas
                </h3>
                <div className={styles.priorityButtons}>
                    <button type="button" className={`${styles.priorityButton} ${styles.alta} ${formData.priority === 'alta' ? styles.selected : ''}`} onClick={() => handlePriorityChange('alta')}>Alta</button>
                    <button type="button" className={`${styles.priorityButton} ${styles.media} ${formData.priority === 'media' ? styles.selected : ''}`} onClick={() => handlePriorityChange('media')}>Média</button>
                    <button type="button" className={`${styles.priorityButton} ${styles.baixa} ${formData.priority === 'baixa' ? styles.selected : ''}`} onClick={() => handlePriorityChange('baixa')}>Baixa</button>
                </div>
                
                <div className={styles.tagCreator} style={{marginTop: '1rem'}}>
                    <input type="text" className={styles.tagInput} value={newTagText} onChange={(e) => setNewTagText(e.target.value)} placeholder="Nova etiqueta..." />
                    <button type="button" className={styles.addButton} onClick={handleAddTag}>Adicionar</button>
                </div>
                <div className={styles.colorPicker}>
                    {availableColors.map(color => (
                        <div key={color} className={`${styles.colorDot} ${newTagColor === color ? styles.selected : ''}`} style={{ backgroundColor: color }} onClick={() => setNewTagColor(color)} />
                    ))}
                </div>
                <div className={styles.tagList} style={{ marginTop: '0.5rem' }}>
                    {(formData.tags || []).map((tag, index) => (
                        <div key={index} className={styles.tagItem} style={{ backgroundColor: tag.color }}>
                            <span>{tag.text}</span>
                            <button type="button" className={styles.tagRemoveButton} onClick={() => handleRemoveTag(index)}>&times;</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconChecklist /> Análise de Acordo
                </h3>
                <div style={{ marginTop: '10px' }}>
                    <AgreementChecklist 
                        checklistData={formData.agreement_checklist_data} 
                        onUpdate={handleChecklistChange} 
                    />
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle} style={headerStyle}>
                    <IconBriefcase /> Observações
                </h3>
                <div className={styles.formGroup}>
                    <textarea className={styles.input} name="description" value={formData.description || ''} onChange={handleChange} rows="4"></textarea>
                </div>
            </div>
        </>
    );
};

// --- COMPONENTE PRINCIPAL ---
const EditCaseModal = ({ legalCase, onClose, onCaseUpdated, clients, lawyers }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [newTagText, setNewTagText] = useState('');
    const [newTagColor, setNewTagColor] = useState('#EF4444');
    
    // Estados para o Advogado Adverso
    const [opposingLawyersList, setOpposingLawyersList] = useState([]);
    const [lawyerSearchTerm, setLawyerSearchTerm] = useState('');
    const [showLawyerDropdown, setShowLawyerDropdown] = useState(false);
    
    // Controle dos Modais
    const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false); // <--- Estado para a Lupa

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Carregar Advogados Adversos
    useEffect(() => {
        const fetchOpposingLawyers = async () => {
            if (!token) return;
            try {
                const response = await apiClient.get('/opposing-lawyers', { headers: { Authorization: `Bearer ${token}` } });
                setOpposingLawyersList(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.error("Erro ao carregar advogados adversos:", err);
            }
        };
        fetchOpposingLawyers();
    }, [token]);

    useEffect(() => {
        if (legalCase) {
            setFormData({
                ...legalCase,
                client_id: legalCase.client?.id || '',
                lawyer_id: legalCase.lawyer?.id || '',
                
                // Mapear campos novos e existentes
                internal_number: legalCase.internal_number || '',
                city: legalCase.city || '',
                special_court: legalCase.special_court || 'Não',
                updated_condemnation_value: legalCase.updated_condemnation_value || '',
                pcond_probability: legalCase.pcond_probability || '',
                opposing_lawyer_id: legalCase.opposing_lawyer_id || '',
                opposing_lawyer: legalCase.opposing_lawyer || '',
                opposing_contact: legalCase.opposing_contact || '',
            });
            
            // Inicializar a busca com o nome atual do advogado
            setLawyerSearchTerm(legalCase.opposing_lawyer || '');
            
            setConversation(null);
            setMessages([]);
            setActiveTab('details');
        }
    }, [legalCase]);

    // Handlers para o Advogado Adverso
    const handleSelectLawyer = (lawyer) => {
        setFormData(prev => ({
            ...prev,
            opposing_lawyer_id: lawyer.id,
            opposing_lawyer: lawyer.name,
            opposing_contact: lawyer.phone || ''
        }));
        setLawyerSearchTerm(lawyer.name);
        setShowLawyerDropdown(false);
    };

    const handleCreateLawyer = () => {
        setIsLawyerModalOpen(true);
        setShowLawyerDropdown(false);
    };

    const handleOpenListModal = () => {
        setIsListModalOpen(true);
    };

    const handleLawyerCreated = (newLawyer) => {
        setOpposingLawyersList(prev => [...prev, newLawyer]);
        handleSelectLawyer(newLawyer);
    };

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
            console.error("Erro ao buscar conversa:", err);
            setConversation(null);
            setMessages([]);
        } finally {
            setChatLoading(false);
        }
    }, [legalCase?.id, token]);

    useEffect(() => {
        if (activeTab === 'chat') fetchConversation();
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
            alert('Não foi possível enviar a mensagem.');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleChange = (e) => { 
        const { name, value } = e.target; 
        setFormData(prevState => ({ ...prevState, [name]: value })); 
    };
    
    const handleChecklistChange = (checklistData) => {
        setFormData(prev => ({ ...prev, ...checklistData }));
    };

    const handlePriorityChange = (priority) => { setFormData(prevState => ({ ...prevState, priority: priority })); };
    const handleAddTag = () => { if (newTagText.trim() === '') return; const newTag = { text: newTagText, color: newTagColor }; setFormData(prevState => ({ ...prevState, tags: [...(prevState.tags || []), newTag] })); setNewTagText(''); };
    const handleRemoveTag = (indexToRemove) => { setFormData(prevState => ({ ...prevState, tags: prevState.tags.filter((_, index) => index !== indexToRemove) })); };
    
    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        setIsSubmitting(true); 
        setError(''); 
        try { 
            // Converter campos numéricos
            const payload = {
                ...formData,
                original_value: formData.original_value ? parseFloat(formData.original_value) : null,
                cause_value: formData.cause_value ? parseFloat(formData.cause_value) : null,
                agreement_value: formData.agreement_value ? parseFloat(formData.agreement_value) : null,
                updated_condemnation_value: formData.updated_condemnation_value ? parseFloat(formData.updated_condemnation_value) : null,
                pcond_probability: formData.pcond_probability ? parseFloat(formData.pcond_probability) : null,
            };

            await apiClient.put(`/cases/${legalCase.id}`, payload, { headers: { Authorization: `Bearer ${token}` } }); 
            alert('Caso atualizado com sucesso!'); 
            if (onCaseUpdated) { onCaseUpdated(); } 
            onClose(); 
        } catch (err) { 
            console.error("Erro ao atualizar:", err); 
            setError('Erro ao salvar. Verifique os dados.'); 
        } finally { 
            setIsSubmitting(false); 
        } 
    };

    if (!legalCase) return null;

    return (
        <>
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={`${styles.modalContent} ${styles.large}`} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2 className={styles.modalTitle}>Editar Processo #{formData.case_number}</h2>
                        <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                    </div>

                    <div className={styles.tabNav}>
                        <button className={`${styles.tabButton} ${activeTab === 'details' ? styles.active : ''}`} onClick={() => setActiveTab('details')}>Detalhes</button>
                        <button className={`${styles.tabButton} ${activeTab === 'chat' ? styles.active : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
                        <button className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`} onClick={() => setActiveTab('history')}>Histórico</button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === 'details' && (
                            <form onSubmit={handleSubmit}>
                                <DetailsTab 
                                    formData={formData} 
                                    handleChange={handleChange} 
                                    handlePriorityChange={handlePriorityChange} 
                                    handleAddTag={handleAddTag} 
                                    handleRemoveTag={handleRemoveTag} 
                                    newTagText={newTagText} 
                                    setNewTagText={setNewTagText} 
                                    newTagColor={newTagColor} 
                                    setNewTagColor={setNewTagColor} 
                                    clients={clients} 
                                    lawyers={lawyers}
                                    handleChecklistChange={handleChecklistChange}
                                    
                                    // Props do Advogado Adverso (Lupa + Create)
                                    opposingLawyersList={opposingLawyersList}
                                    lawyerSearchTerm={lawyerSearchTerm}
                                    setLawyerSearchTerm={setLawyerSearchTerm}
                                    showLawyerDropdown={showLawyerDropdown}
                                    setShowLawyerDropdown={setShowLawyerDropdown}
                                    handleSelectLawyer={handleSelectLawyer}
                                    handleCreateLawyer={handleCreateLawyer}
                                    handleOpenListModal={handleOpenListModal} // <--- Passando a função
                                />
                                {error && <p className={styles.error}>{error}</p>}
                                <div className={styles.actions}> 
                                    <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button> 
                                    <button type="submit" className={styles.saveButton} disabled={isSubmitting}> {isSubmitting ? 'Salvando...' : 'Salvar Alterações'} </button> 
                                </div>
                            </form>
                        )}

                        {activeTab === 'chat' && (
                            <div className={styles.chatColumn}>
                                {chatLoading ? <p>Carregando...</p> : conversation ? (
                                    <ChatPreview
                                        messages={messages}
                                        onSendMessage={handleSendMessage}
                                        isSending={isSending}
                                        isInteractive={true}
                                        contactName={legalCase.opposing_party}
                                        contactNumber={legalCase.opposing_contact}
                                    />
                                ) : <p>Sem conversa iniciada.</p>}
                            </div>
                        )}

                        {activeTab === 'history' && <HistoryTab caseId={legalCase.id} />}
                    </div>
                </div>
            </div>

            {/* Modal de Criação de Advogado */}
            {isLawyerModalOpen && (
                <AddEditOpposingLawyerModal 
                    onClose={() => setIsLawyerModalOpen(false)}
                    onSuccess={handleLawyerCreated}
                    initialName={lawyerSearchTerm}
                />
            )}

            {/* Modal de Listagem/Busca e Marcação de Abusivo */}
            {isListModalOpen && (
                <OpposingLawyerListModal
                    onClose={() => setIsListModalOpen(false)}
                    onSelect={handleSelectLawyer}
                />
            )}
        </>
    );
};

export default EditCaseModal;