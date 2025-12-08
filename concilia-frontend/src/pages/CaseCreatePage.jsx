import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/CaseCreatePage.module.css';
import AgreementChecklist from '../components/AgreementChecklist';
import AddEditOpposingLawyerModal from '../components/AddEditOpposingLawyerModal';

// --- Ícones SVG Inline ---
const IconArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const IconBriefcase = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDollar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconMap = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IconChecklist = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconSave = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Constantes ---
const BRAZILIAN_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ACTION_OBJECTS = [
    "Contrato de Empréstimo - Juros Abusivos", 
    "Cartão de Crédito - Cobrança Indevida", 
    "Financiamento Imobiliário - Revisional", 
    "Conta Corrente - Tarifas Abusivas", 
    "Consignado - Desconto Indevido", 
    "Cheque Especial - Juros Excessivos", 
    "Seguro - Cobrança Indevida", 
    "CDC - Venda Casada",
    "Outros"
];

const CaseCreatePage = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [opposingLawyersList, setOpposingLawyersList] = useState([]); 
    
    // Controle do Modal de Advogado Adverso e Dropdown
    const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
    const [lawyerSearchTerm, setLawyerSearchTerm] = useState('');
    const [showLawyerDropdown, setShowLawyerDropdown] = useState(false);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');

    // Estado do Formulário
    const [formData, setFormData] = useState({
        case_number: '',
        action_object: '',
        start_date: new Date().toISOString().split('T')[0],
        internal_number: '',
        opposing_party: '',
        defendant: '',
        client_id: '',
        lawyer_id: '',
        opposing_lawyer_id: '',   
        opposing_lawyer_name: '', 
        opposing_contact: '',     
        comarca: '',
        state: '',
        special_court: 'Não',
        city: '',
        cause_value: '',
        original_value: '',
        agreement_value: '', 
        priority: 'media',
        status: 'initial_analysis',
        description: '',
        pcond_probability: '',
        updated_condemnation_value: '',
        agreement_probability: 0,
        agreement_checklist_data: null
    });

    useEffect(() => {
        const fetchDependencies = async () => {
            if (!token) return;
            try {
                const [clientsRes, usersRes, lawyersRes] = await Promise.all([
                    apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/opposing-lawyers', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
                setLawyers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
                setOpposingLawyersList(Array.isArray(lawyersRes.data) ? lawyersRes.data : []);
            } catch (error) {
                console.error("Erro ao carregar listas:", error);
                setGeneralError("Não foi possível carregar listas. Verifique a conexão.");
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchDependencies();
    }, [token]);

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'case_number') {
            let raw = value.replace(/\D/g, ''); 
            if (raw.length > 20) raw = raw.slice(0, 20);
            let masked = raw;
            if (raw.length > 7) masked = raw.replace(/^(\d{7})(\d)/, '$1-$2');
            if (raw.length > 9) masked = masked.replace(/-(\d{2})(\d)/, '-$1.$2');
            if (raw.length > 13) masked = masked.replace(/\.(\d{4})(\d)/, '.$1.$2');
            if (raw.length > 14) masked = masked.replace(/\.(\d{4})\.(\d{1})(\d)/, '.$1.$2.$3');
            if (raw.length > 16) masked = masked.replace(/\.(\d{1})\.(\d{2})(\d)/, '.$1.$2.$3');
            if (raw.length >= 20) masked = raw.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
            value = masked;
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'opposing_lawyer_name') {
            setLawyerSearchTerm(value);
            setShowLawyerDropdown(true);
            if (value === '') {
                setFormData(prev => ({ ...prev, opposing_lawyer_id: '', opposing_contact: '' }));
            }
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const filteredLawyers = opposingLawyersList.filter(l => 
        l.name.toLowerCase().includes(lawyerSearchTerm.toLowerCase()) || 
        (l.oab && l.oab.toLowerCase().includes(lawyerSearchTerm.toLowerCase()))
    );

    const handleSelectLawyer = (lawyer) => {
        setFormData(prev => ({
            ...prev,
            opposing_lawyer_id: lawyer.id,
            opposing_lawyer_name: lawyer.name,
            opposing_contact: lawyer.phone || ''
        }));
        setLawyerSearchTerm(lawyer.name);
        setShowLawyerDropdown(false);
    };

    const handleCreateLawyer = () => {
        setIsLawyerModalOpen(true);
        setShowLawyerDropdown(false);
    };

    const handleLawyerCreated = (newLawyer) => {
        setOpposingLawyersList(prev => [...prev, newLawyer]);
        handleSelectLawyer(newLawyer);
    };

    const handlePriorityChange = (value) => {
        setFormData(prev => ({ ...prev, priority: value }));
    };

    const handleChecklistUpdate = (updatedChecklistData) => {
        setFormData(prev => ({
            ...prev,
            agreement_checklist_data: updatedChecklistData.agreement_checklist_data,
            agreement_probability: updatedChecklistData.agreement_probability
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.case_number.trim()) newErrors.case_number = "Obrigatório.";
        else if (formData.case_number.length < 20) newErrors.case_number = "Incompleto.";
        if (!formData.action_object) newErrors.action_object = "Obrigatório.";
        if (!formData.start_date) newErrors.start_date = "Obrigatório.";
        if (!formData.opposing_party.trim()) newErrors.opposing_party = "Obrigatório.";
        if (!formData.defendant.trim()) newErrors.defendant = "Obrigatório.";
        if (!formData.client_id) newErrors.client_id = "Obrigatório.";
        if (!formData.comarca.trim()) newErrors.comarca = "Obrigatório.";
        if (!formData.state) newErrors.state = "Obrigatório.";
        if (!formData.city.trim()) newErrors.city = "Obrigatório.";
        if (!formData.cause_value) newErrors.cause_value = "Obrigatório.";
        if (!formData.original_value) newErrors.original_value = "Obrigatório.";
        
        const hasMateria = formData.agreement_checklist_data?.objective?.materia;
        if (!hasMateria) {
            newErrors.checklist = "O item 'Matéria' no checklist é obrigatório.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneralError('');

        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                opposing_lawyer: formData.opposing_lawyer_name,
                original_value: parseFloat(formData.original_value),
                cause_value: parseFloat(formData.cause_value),
                agreement_value: formData.agreement_value ? parseFloat(formData.agreement_value) : null,
                pcond_probability: formData.pcond_probability ? parseFloat(formData.pcond_probability) : null,
                updated_condemnation_value: formData.updated_condemnation_value ? parseFloat(formData.updated_condemnation_value) : null,
            };

            await apiClient.post('/cases', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            navigate('/pipeline');

        } catch (error) {
            console.error("Erro ao salvar:", error);
            if (error.response?.status === 422 && error.response?.data?.errors) {
                const backendErrors = {};
                Object.keys(error.response.data.errors).forEach(key => {
                    backendErrors[key] = error.response.data.errors[key][0];
                });
                setErrors(backendErrors);
                setGeneralError("Verifique os erros no formulário.");
            } else {
                setGeneralError(error.response?.data?.message || "Erro ao criar caso.");
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return <div className={styles.container} style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <p>Carregando...</p>
        </div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Novo Caso</h1>
                    <p>Cadastre um novo processo jurídico no sistema.</p>
                </div>
                <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
                    <IconArrowLeft /> Voltar
                </button>
            </div>

            {generalError && (
                <div className={styles.errorBanner}>
                    <IconAlert />
                    <span>{generalError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                
                {/* 1. DADOS DO PROCESSO */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconBriefcase /></div>
                        <h2>Dados do Processo</h2>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Número do Processo <span className={styles.required}>*</span></label>
                            <input 
                                className={`${styles.input} ${errors.case_number ? styles.errorInput : ''}`}
                                type="text"
                                name="case_number"
                                value={formData.case_number}
                                onChange={handleChange}
                                placeholder="0000000-00.0000.0.00.0000"
                            />
                            {errors.case_number && <span className={styles.errorMessage}>{errors.case_number}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Objeto da Ação <span className={styles.required}>*</span></label>
                            <select className={`${styles.select} ${errors.action_object ? styles.errorInput : ''}`} name="action_object" value={formData.action_object} onChange={handleChange}>
                                <option value="">Selecione...</option>
                                {ACTION_OBJECTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {errors.action_object && <span className={styles.errorMessage}>{errors.action_object}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Data de Distribuição <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.start_date ? styles.errorInput : ''}`} type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                            {errors.start_date && <span className={styles.errorMessage}>{errors.start_date}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Número Interno</label>
                            <input className={styles.input} type="text" name="internal_number" value={formData.internal_number} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                {/* 2. PARTES E ENVOLVIDOS */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconUsers /></div>
                        <h2>Partes e Envolvidos</h2>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Autor (Parte Adversa) <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.opposing_party ? styles.errorInput : ''}`} type="text" name="opposing_party" value={formData.opposing_party} onChange={handleChange} />
                            {errors.opposing_party && <span className={styles.errorMessage}>{errors.opposing_party}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Réu (Empresa) <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.defendant ? styles.errorInput : ''}`} type="text" name="defendant" value={formData.defendant} onChange={handleChange} />
                            {errors.defendant && <span className={styles.errorMessage}>{errors.defendant}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cliente (Banco) <span className={styles.required}>*</span></label>
                            <select className={`${styles.select} ${errors.client_id ? styles.errorInput : ''}`} name="client_id" value={formData.client_id} onChange={handleChange}>
                                <option value="">Selecione...</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                            {errors.client_id && <span className={styles.errorMessage}>{errors.client_id}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Advogado Responsável</label>
                            <select className={styles.select} name="lawyer_id" value={formData.lawyer_id} onChange={handleChange}>
                                <option value="">Selecione...</option>
                                {lawyers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </select>
                        </div>

                        {/* --- CAMPO DE ADVOGADO ADVERSO + BOTÃO + --- */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Advogado Adverso (Pesquisar ou Criar)</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input 
                                        className={styles.input} 
                                        type="text" 
                                        name="opposing_lawyer_name" 
                                        value={formData.opposing_lawyer_name} 
                                        onChange={handleChange} 
                                        onFocus={() => setShowLawyerDropdown(true)}
                                        placeholder="Nome ou OAB..."
                                        autoComplete="off"
                                    />
                                    
                                    {/* DROPDOWN AGORA USA CLASSES CSS (DARK MODE) */}
                                    {showLawyerDropdown && lawyerSearchTerm && (
                                        <ul className={styles.dropdownList}>
                                            {filteredLawyers.map(l => (
                                                <li key={l.id} 
                                                    className={styles.dropdownItem}
                                                    onClick={() => handleSelectLawyer(l)}
                                                >
                                                    <strong>{l.name}</strong> <small style={{color: '#a0aec0'}}>({l.oab || 'S/ OAB'})</small>
                                                </li>
                                            ))}
                                            <li 
                                                className={styles.dropdownItemNew}
                                                onClick={handleCreateLawyer}
                                            >
                                                <IconPlus /> Cadastrar Novo: "{lawyerSearchTerm}"
                                            </li>
                                        </ul>
                                    )}
                                    
                                    {showLawyerDropdown && (
                                        <div 
                                            style={{position: 'fixed', inset:0, zIndex: 40}} 
                                            onClick={() => setShowLawyerDropdown(false)} 
                                        />
                                    )}
                                </div>
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
                            <label className={styles.label}>Contato do Advogado</label>
                            <input className={styles.input} type="text" name="opposing_contact" value={formData.opposing_contact} readOnly placeholder="Automático" />
                        </div>
                    </div>
                </section>

                {/* 3. LOCALIZAÇÃO */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconMap /></div>
                        <h2>Localização</h2>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Comarca <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.comarca ? styles.errorInput : ''}`} type="text" name="comarca" value={formData.comarca} onChange={handleChange} />
                             {errors.comarca && <span className={styles.errorMessage}>{errors.comarca}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Estado (UF) <span className={styles.required}>*</span></label>
                            <select className={`${styles.select} ${errors.state ? styles.errorInput : ''}`} name="state" value={formData.state} onChange={handleChange}>
                                <option value="">UF</option>
                                {BRAZILIAN_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                            {errors.state && <span className={styles.errorMessage}>{errors.state}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cidade <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.city ? styles.errorInput : ''}`} type="text" name="city" value={formData.city} onChange={handleChange} />
                            {errors.city && <span className={styles.errorMessage}>{errors.city}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Natureza (Juizado Especial)?</label>
                            <select className={styles.select} name="special_court" value={formData.special_court} onChange={handleChange}>
                                <option value="Não">Não</option>
                                <option value="Sim">Sim</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 4. FINANCEIRO */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconDollar /></div>
                        <h2>Financeiro</h2>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valor da Causa (R$) <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.cause_value ? styles.errorInput : ''}`} type="number" step="0.01" name="cause_value" value={formData.cause_value} onChange={handleChange} />
                            {errors.cause_value && <span className={styles.errorMessage}>{errors.cause_value}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valor de Alçada (R$) <span className={styles.required}>*</span></label>
                            <input className={`${styles.input} ${errors.original_value ? styles.errorInput : ''}`} type="number" step="0.01" name="original_value" value={formData.original_value} onChange={handleChange} />
                            {errors.original_value && <span className={styles.errorMessage}>{errors.original_value}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Proposta Inicial (R$)</label>
                            <input className={styles.input} type="number" step="0.01" name="agreement_value" value={formData.agreement_value} onChange={handleChange} />
                        </div>
                         <div className={styles.formGroup}>
                            <label className={styles.label}>PCOND (Probabilidade %)</label>
                            <input className={styles.input} type="number" step="0.01" max="100" name="pcond_probability" value={formData.pcond_probability} onChange={handleChange} />
                        </div>
                         <div className={styles.formGroup}>
                            <label className={styles.label}>Condenação Atualizada (R$)</label>
                            <input className={styles.input} type="number" step="0.01" name="updated_condemnation_value" value={formData.updated_condemnation_value} onChange={handleChange} />
                        </div>
                    </div>
                    
                    <div className={styles.grid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Prioridade</label>
                            <div className={styles.priorityGroup}>
                                <button type="button" className={`${styles.priorityButton} ${formData.priority === 'alta' ? `${styles.selected} ${styles.alta}` : ''}`} onClick={() => handlePriorityChange('alta')}>Alta</button>
                                <button type="button" className={`${styles.priorityButton} ${formData.priority === 'media' ? `${styles.selected} ${styles.media}` : ''}`} onClick={() => handlePriorityChange('media')}>Média</button>
                                <button type="button" className={`${styles.priorityButton} ${formData.priority === 'baixa' ? `${styles.selected} ${styles.baixa}` : ''}`} onClick={() => handlePriorityChange('baixa')}>Baixa</button>
                            </div>
                        </div>
                        <div className={styles.formGroup.fullWidth}>
                            <label className={styles.label}>Observações</label>
                            <textarea className={styles.textarea} name="description" value={formData.description} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                {/* 5. CHECKLIST ACORDO */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconChecklist /></div>
                        <h2>Checklist ACORDO</h2>
                    </div>
                    
                    {errors.checklist && <div className={styles.errorBanner} style={{marginBottom: '1rem'}}>{errors.checklist}</div>}

                    {/* Usamos o componente existente AgreementChecklist */}
                    <div style={{ marginTop: '1rem' }}>
                        <AgreementChecklist 
                            checklistData={formData.agreement_checklist_data} 
                            onUpdate={handleChecklistUpdate}
                        />
                    </div>
                </section>

                <div className={styles.footer}>
                    <button type="button" className={styles.cancelButton} onClick={() => navigate(-1)}>Cancelar</button>
                    <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                        <IconSave /> {isSubmitting ? 'Salvando...' : 'Criar Caso'}
                    </button>
                </div>
            </form>

            {/* Modal de Criação de Advogado */}
            {isLawyerModalOpen && (
                <AddEditOpposingLawyerModal 
                    onClose={() => setIsLawyerModalOpen(false)}
                    onSuccess={handleLawyerCreated}
                    initialName={lawyerSearchTerm}
                />
            )}
        </div>
    );
};

export default CaseCreatePage;