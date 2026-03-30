import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/CaseCreatePage.module.css';
import AgreementChecklist from '../components/AgreementChecklist';
import AddEditOpposingLawyerModal from '../components/AddEditOpposingLawyerModal';
import OpposingLawyerListModal from '../components/OpposingLawyerListModal';
import AddEditActionObjectModal from '../components/AddEditActionObjectModal';
import ActionObjectListModal from '../components/ActionObjectListModal';
import AddEditPlaintiffModal from '../components/AddEditPlaintiffModal';
import AddEditDefendantModal from '../components/AddEditDefendantModal';
import { FaExclamationTriangle } from 'react-icons/fa';
import {
    LIVELO_MIN_POINTS,
    normalizeSettlementBenefitPayload,
    OUROCAP_MIN_VALUE,
    SETTLEMENT_BENEFIT_OPTIONS,
    SETTLEMENT_BENEFIT_TYPES,
    validateSettlementBenefit
} from '../constants/settlementBenefit';
import { appendCaseTag, normalizeCaseTags } from '../constants/caseTags';

// --- Ícones SVG Inline ---
const IconArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const IconBriefcase = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDollar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconMap = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IconChecklist = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconSave = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

// --- Constantes ---
const BRAZILIAN_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const availableColors = ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899'];

const CaseCreatePage = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    // Listas de Dados
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [opposingLawyersList, setOpposingLawyersList] = useState([]);
    const [actionObjectsList, setActionObjectsList] = useState([]);
    const [plaintiffsList, setPlaintiffsList] = useState([]); // Nova Lista
    const [defendantsList, setDefendantsList] = useState([]); // Nova Lista
    
    // Controle dos Modais
    const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isActionObjectModalOpen, setIsActionObjectModalOpen] = useState(false);
    const [isActionObjectListModalOpen, setIsActionObjectListModalOpen] = useState(false);
    const [isPlaintiffModalOpen, setIsPlaintiffModalOpen] = useState(false); // Novo Modal Autor
    const [isDefendantModalOpen, setIsDefendantModalOpen] = useState(false); // Novo Modal Réu
    
    // Estados de Busca e Dropdown
    const [lawyerSearchTerm, setLawyerSearchTerm] = useState('');
    const [showLawyerDropdown, setShowLawyerDropdown] = useState(false);

    const [actionObjectSearchTerm, setActionObjectSearchTerm] = useState('');
    const [showActionObjectDropdown, setShowActionObjectDropdown] = useState(false);

    const [plaintiffSearchTerm, setPlaintiffSearchTerm] = useState(''); // Busca Autor
    const [showPlaintiffDropdown, setShowPlaintiffDropdown] = useState(false);

    const [defendantSearchTerm, setDefendantSearchTerm] = useState(''); // Busca Réu
    const [showDefendantDropdown, setShowDefendantDropdown] = useState(false);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');

    // Tags
    const [newTagText, setNewTagText] = useState('');
    const [newTagColor, setNewTagColor] = useState(availableColors[0]);
    const [savedTags, setSavedTags] = useState([]);
    const [selectedSavedTagText, setSelectedSavedTagText] = useState('');
    const [settlementBenefitType, setSettlementBenefitType] = useState(SETTLEMENT_BENEFIT_TYPES.NONE);

    // Estado do Formulário
    const [formData, setFormData] = useState({
        case_number: '',
        action_object: '',
        action_object_id: '',
        start_date: new Date().toISOString().split('T')[0],
        internal_number: '',
        
        opposing_party: '', // String (Nome do Autor)
        plaintiff_id: '',   // ID do Autor
        
        defendant: '',      // String (Nome do Réu)
        defendant_id: '',   // ID do Réu
        
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
        ourocap_value: '',
        livelo_points: '',
        priority: 'media',
        status: 'initial_analysis',
        description: '',
        pcond_probability: '',
        updated_condemnation_value: '',
        agreement_probability: 0,
        agreement_checklist_data: null,
        tags: []
    });

    useEffect(() => {
        const fetchDependencies = async () => {
            if (!token) return;
            try {
                const [clientsRes, usersRes, lawyersRes, actionObjectsRes, plaintiffsRes, defendantsRes, caseTagsRes] = await Promise.all([
                    apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/opposing-lawyers', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/action-objects', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/plaintiffs', { headers: { Authorization: `Bearer ${token}` } }), // Fetch Autores
                    apiClient.get('/defendants', { headers: { Authorization: `Bearer ${token}` } }),  // Fetch Réus
                    apiClient.get('/case-tags', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
                setLawyers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
                setOpposingLawyersList(Array.isArray(lawyersRes.data) ? lawyersRes.data : []);
                setActionObjectsList(Array.isArray(actionObjectsRes.data) ? actionObjectsRes.data : []);
                setPlaintiffsList(Array.isArray(plaintiffsRes.data) ? plaintiffsRes.data : []);
                setDefendantsList(Array.isArray(defendantsRes.data) ? defendantsRes.data : []);
                setSavedTags(Array.isArray(caseTagsRes.data) ? caseTagsRes.data : []);
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

        if (name === 'action_object') {
            setFormData(prev => ({ ...prev, action_object: value, action_object_id: '' }));
            setActionObjectSearchTerm(value);
            setShowActionObjectDropdown(true);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Lógica Advogado
        if (name === 'opposing_lawyer_name') {
            setLawyerSearchTerm(value);
            setShowLawyerDropdown(true);
            if (value === '') setFormData(prev => ({ ...prev, opposing_lawyer_id: '', opposing_contact: '' }));
        }

        // Lógica Autor (Plaintiff)
        if (name === 'opposing_party') {
            setPlaintiffSearchTerm(value);
            setShowPlaintiffDropdown(true);
            // Se limpar, remove o ID
            if (value === '') setFormData(prev => ({ ...prev, plaintiff_id: '' }));
        }

        // Lógica Réu (Defendant)
        if (name === 'defendant') {
            setDefendantSearchTerm(value);
            setShowDefendantDropdown(true);
            if (value === '') setFormData(prev => ({ ...prev, defendant_id: '' }));
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                if (name === 'action_object') delete newErrors.action_object_id;
                return newErrors;
            });
        }
    };

    const clearSettlementBenefitErrors = () => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.ourocap_value;
            delete newErrors.livelo_points;
            return newErrors;
        });
    };

    const handleSettlementBenefitTypeChange = (e) => {
        const value = e.target.value;
        setSettlementBenefitType(value);
        clearSettlementBenefitErrors();

        setFormData(prev => ({
            ...prev,
            ourocap_value: value === SETTLEMENT_BENEFIT_TYPES.OUROCAP ? prev.ourocap_value : '',
            livelo_points: value === SETTLEMENT_BENEFIT_TYPES.LIVELO ? prev.livelo_points : '',
        }));
    };

    // --- FILTROS DE PESQUISA ---
    const filteredActionObjects = actionObjectsList.filter(actionObject =>
        (actionObject.name || '').toLowerCase().includes(actionObjectSearchTerm.toLowerCase())
    );

    const filteredLawyers = opposingLawyersList.filter(l => 
        l.name.toLowerCase().includes(lawyerSearchTerm.toLowerCase()) || 
        (l.oab && l.oab.toLowerCase().includes(lawyerSearchTerm.toLowerCase()))
    );

    const filteredPlaintiffs = plaintiffsList.filter(p => 
        p.name.toLowerCase().includes(plaintiffSearchTerm.toLowerCase()) || 
        (p.cpf_cnpj && p.cpf_cnpj.includes(plaintiffSearchTerm))
    );

    const filteredDefendants = defendantsList.filter(d => 
        d.name.toLowerCase().includes(defendantSearchTerm.toLowerCase()) || 
        (d.cnpj && d.cnpj.includes(defendantSearchTerm))
    );

    // --- SELEÇÃO ---
    const handleSelectActionObject = (actionObject) => {
        setFormData(prev => ({
            ...prev,
            action_object_id: actionObject.id,
            action_object: actionObject.name
        }));
        setActionObjectSearchTerm(actionObject.name);
        setShowActionObjectDropdown(false);
    };

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

    const handleSelectPlaintiff = (plaintiff) => {
        setFormData(prev => ({
            ...prev,
            plaintiff_id: plaintiff.id,
            opposing_party: plaintiff.name // Preenche o campo de texto visual
        }));
        setPlaintiffSearchTerm(plaintiff.name);
        setShowPlaintiffDropdown(false);
    };

    const handleSelectDefendant = (defendant) => {
        setFormData(prev => ({
            ...prev,
            defendant_id: defendant.id,
            defendant: defendant.name // Preenche o campo de texto visual
        }));
        setDefendantSearchTerm(defendant.name);
        setShowDefendantDropdown(false);
    };

    // --- CRIAÇÃO VIA MODAL ---
    const handleLawyerCreated = (newLawyer) => {
        setOpposingLawyersList(prev => [...prev, newLawyer]);
        handleSelectLawyer(newLawyer);
    };

    const handleActionObjectSaved = (savedActionObject) => {
        setActionObjectsList(prev => {
            const alreadyExists = prev.some(actionObject => actionObject.id === savedActionObject.id);
            const nextList = alreadyExists
                ? prev.map(actionObject => actionObject.id === savedActionObject.id ? savedActionObject : actionObject)
                : [...prev, savedActionObject];

            return nextList.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
        });
        handleSelectActionObject(savedActionObject);
    };

    const handlePlaintiffCreated = (newPlaintiff) => {
        setPlaintiffsList(prev => [...prev, newPlaintiff]);
        handleSelectPlaintiff(newPlaintiff);
    };

    const handleDefendantCreated = (newDefendant) => {
        setDefendantsList(prev => [...prev, newDefendant]);
        handleSelectDefendant(newDefendant);
    };

    // --- ABRIR MODAIS ---
    const handleCreateLawyer = () => { setIsLawyerModalOpen(true); setShowLawyerDropdown(false); };
    const handleCreateActionObject = () => { setIsActionObjectModalOpen(true); setShowActionObjectDropdown(false); };
    const handleOpenActionObjectListModal = () => { setIsActionObjectListModalOpen(true); setShowActionObjectDropdown(false); };
    const handleCreatePlaintiff = () => { setIsPlaintiffModalOpen(true); setShowPlaintiffDropdown(false); };
    const handleCreateDefendant = () => { setIsDefendantModalOpen(true); setShowDefendantDropdown(false); };
    
    const handleOpenListModal = () => { setIsListModalOpen(true); };

    // --- OUTROS ---
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

    const handleAddTag = () => {
        if (newTagText.trim() === '') return;
        setFormData(prevState => ({
          ...prevState,
          tags: appendCaseTag(prevState.tags, { text: newTagText, color: newTagColor })
        }));
        setNewTagText('');
    };

    const handleAddSavedTag = () => {
        if (!selectedSavedTagText) return;

        const selectedTag = savedTags.find(tag => (tag.text || tag.name) === selectedSavedTagText);
        if (!selectedTag) return;

        setFormData(prevState => ({
            ...prevState,
            tags: appendCaseTag(prevState.tags, selectedTag)
        }));
        setSelectedSavedTagText('');
    };

    const handleRemoveTag = (indexToRemove) => {
        setFormData(prevState => ({
          ...prevState,
          tags: prevState.tags.filter((_, index) => index !== indexToRemove)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.case_number.trim()) newErrors.case_number = "Obrigatório.";
        else if (formData.case_number.length < 20) newErrors.case_number = "Incompleto.";
        if (!formData.action_object.trim()) newErrors.action_object = "Obrigatório.";
        if (!formData.start_date) newErrors.start_date = "Obrigatório.";
        if (!formData.opposing_party.trim()) newErrors.opposing_party = "Obrigatório.";
        if (!formData.defendant.trim()) newErrors.defendant = "Obrigatório.";
        if (!formData.client_id) newErrors.client_id = "Obrigatório.";
        if (!formData.comarca.trim()) newErrors.comarca = "Obrigatório.";
        if (!formData.state) newErrors.state = "Obrigatório.";
        if (!formData.city.trim()) newErrors.city = "Obrigatório.";
        if (!formData.cause_value) newErrors.cause_value = "Obrigatório.";

        const settlementBenefitError = validateSettlementBenefit({
            settlementBenefitType,
            ourocap_value: formData.ourocap_value,
            livelo_points: formData.livelo_points,
        });
        if (settlementBenefitError) {
            if (settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.OUROCAP) {
                newErrors.ourocap_value = settlementBenefitError;
            }

            if (settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.LIVELO) {
                newErrors.livelo_points = settlementBenefitError;
            }
        }
        
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
                action_object: formData.action_object.trim(),
                original_value: formData.original_value ? parseFloat(formData.original_value) : null,
                cause_value: parseFloat(formData.cause_value),
                agreement_value: formData.agreement_value ? parseFloat(formData.agreement_value) : null,
                ...normalizeSettlementBenefitPayload({
                    settlementBenefitType,
                    ourocap_value: formData.ourocap_value,
                    livelo_points: formData.livelo_points,
                }),
                tags: normalizeCaseTags(formData.tags),
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
                            <div className={styles.inputGroupWithButtons}>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={`${styles.input} ${(errors.action_object || errors.action_object_id) ? styles.errorInput : ''}`}
                                        type="text"
                                        name="action_object"
                                        value={formData.action_object}
                                        onChange={handleChange}
                                        onFocus={() => setShowActionObjectDropdown(true)}
                                        placeholder="Pesquisar objeto da ação..."
                                        autoComplete="off"
                                    />
                                    {showActionObjectDropdown && actionObjectSearchTerm && (
                                        <ul className={styles.dropdownList}>
                                            {filteredActionObjects.map(actionObject => (
                                                <li key={actionObject.id} className={styles.dropdownItem} onClick={() => handleSelectActionObject(actionObject)}>
                                                    <strong>{actionObject.name}</strong>
                                                </li>
                                            ))}
                                            <li className={styles.dropdownItemNew} onClick={handleCreateActionObject}>
                                                <IconPlus /> Cadastrar Novo: "{actionObjectSearchTerm}"
                                            </li>
                                        </ul>
                                    )}
                                    {showActionObjectDropdown && <div style={{position: 'fixed', inset:0, zIndex: 90}} onClick={() => setShowActionObjectDropdown(false)} />}
                                </div>
                                <button type="button" onClick={handleOpenActionObjectListModal} className={`${styles.iconButton} ${styles.searchButton}`} title="Buscar e gerenciar objetos da ação"><IconSearch /></button>
                                <button type="button" onClick={handleCreateActionObject} className={`${styles.iconButton} ${styles.addButtonIcon}`} title="Cadastrar novo objeto da ação"><IconPlus /></button>
                            </div>
                            {(errors.action_object || errors.action_object_id) && <span className={styles.errorMessage}>{errors.action_object || errors.action_object_id}</span>}
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
                        
                        {/* --- CAMPO DE AUTOR (PARTE ADVERSA) COM BUSCA --- */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Autor (Parte Adversa) <span className={styles.required}>*</span></label>
                            <div className={styles.inputGroupWithButtons}>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        className={`${styles.input} ${errors.opposing_party ? styles.errorInput : ''}`} 
                                        type="text" 
                                        name="opposing_party" 
                                        value={formData.opposing_party} 
                                        onChange={handleChange} 
                                        onFocus={() => setShowPlaintiffDropdown(true)}
                                        placeholder="Pesquisar Autor..."
                                        autoComplete="off"
                                    />
                                    {showPlaintiffDropdown && plaintiffSearchTerm && (
                                        <ul className={styles.dropdownList}>
                                            {filteredPlaintiffs.map(p => (
                                                <li key={p.id} className={styles.dropdownItem} onClick={() => handleSelectPlaintiff(p)}>
                                                    <strong>{p.name}</strong> <small>({p.cpf_cnpj || 'S/ CPF'})</small>
                                                </li>
                                            ))}
                                            <li className={styles.dropdownItemNew} onClick={handleCreatePlaintiff}>
                                                <IconPlus /> Cadastrar Novo: "{plaintiffSearchTerm}"
                                            </li>
                                        </ul>
                                    )}
                                    {showPlaintiffDropdown && <div style={{position: 'fixed', inset:0, zIndex: 90}} onClick={() => setShowPlaintiffDropdown(false)} />}
                                </div>
                                <button type="button" onClick={handleCreatePlaintiff} className={`${styles.iconButton} ${styles.addButtonIcon}`} title="Cadastrar Novo Autor"><IconPlus /></button>
                            </div>
                            {errors.opposing_party && <span className={styles.errorMessage}>{errors.opposing_party}</span>}
                        </div>

                        {/* --- CAMPO DE RÉU (EMPRESA) COM BUSCA --- */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Réu (Empresa) <span className={styles.required}>*</span></label>
                            <div className={styles.inputGroupWithButtons}>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        className={`${styles.input} ${errors.defendant ? styles.errorInput : ''}`} 
                                        type="text" 
                                        name="defendant" 
                                        value={formData.defendant} 
                                        onChange={handleChange} 
                                        onFocus={() => setShowDefendantDropdown(true)}
                                        placeholder="Pesquisar Réu..."
                                        autoComplete="off"
                                    />
                                    {showDefendantDropdown && defendantSearchTerm && (
                                        <ul className={styles.dropdownList}>
                                            {filteredDefendants.map(d => (
                                                <li key={d.id} className={styles.dropdownItem} onClick={() => handleSelectDefendant(d)}>
                                                    <strong>{d.name}</strong> <small>({d.cnpj || 'S/ CNPJ'})</small>
                                                </li>
                                            ))}
                                            <li className={styles.dropdownItemNew} onClick={handleCreateDefendant}>
                                                <IconPlus /> Cadastrar Novo: "{defendantSearchTerm}"
                                            </li>
                                        </ul>
                                    )}
                                    {showDefendantDropdown && <div style={{position: 'fixed', inset:0, zIndex: 90}} onClick={() => setShowDefendantDropdown(false)} />}
                                </div>
                                <button type="button" onClick={handleCreateDefendant} className={`${styles.iconButton} ${styles.addButtonIcon}`} title="Cadastrar Novo Réu"><IconPlus /></button>
                            </div>
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

                        {/* --- CAMPO DE ADVOGADO ADVERSO --- */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Advogado Adverso</label>
                            <div className={styles.inputGroupWithButtons}>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        className={styles.input} 
                                        type="text" 
                                        name="opposing_lawyer_name" 
                                        value={formData.opposing_lawyer_name} 
                                        onChange={handleChange} 
                                        onFocus={() => setShowLawyerDropdown(true)}
                                        placeholder="Nome ou OAB..."
                                        autoComplete="off"
                                        style={formData.opposing_lawyer_id && opposingLawyersList.find(l => l.id === formData.opposing_lawyer_id)?.is_abusive ? { borderColor: '#e53e3e', color: '#e53e3e' } : {}}
                                    />
                                    {showLawyerDropdown && lawyerSearchTerm && (
                                        <ul className={styles.dropdownList}>
                                            {filteredLawyers.map(l => (
                                                <li key={l.id} className={styles.dropdownItem} onClick={() => handleSelectLawyer(l)}>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                        {l.is_abusive && <FaExclamationTriangle color="#e53e3e" title="Litigante Abusivo" />}
                                                        <strong>{l.name}</strong> <small>({l.oab || 'S/ OAB'})</small>
                                                    </div>
                                                </li>
                                            ))}
                                            <li className={styles.dropdownItemNew} onClick={handleCreateLawyer}>
                                                <IconPlus /> Cadastrar Novo: "{lawyerSearchTerm}"
                                            </li>
                                        </ul>
                                    )}
                                    {showLawyerDropdown && <div style={{position: 'fixed', inset:0, zIndex: 90}} onClick={() => setShowLawyerDropdown(false)} />}
                                </div>
                                <button type="button" onClick={handleOpenListModal} className={`${styles.iconButton} ${styles.searchButton}`} title="Buscar e Gerenciar Litigantes"><IconSearch /></button>
                                <button type="button" onClick={handleCreateLawyer} className={`${styles.iconButton} ${styles.addButtonIcon}`} title="Cadastrar Novo Advogado"><IconPlus /></button>
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
                            <label className={styles.label}>Valor de Alçada (R$)</label>
                            <input className={`${styles.input} ${errors.original_value ? styles.errorInput : ''}`} type="number" step="0.01" name="original_value" value={formData.original_value} onChange={handleChange} />
                            {errors.original_value && <span className={styles.errorMessage}>{errors.original_value}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Proposta Inicial (R$)</label>
                            <input className={styles.input} type="number" step="0.01" name="agreement_value" value={formData.agreement_value} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Benefício Complementar</label>
                            <select
                                className={styles.select}
                                value={settlementBenefitType}
                                onChange={handleSettlementBenefitTypeChange}
                            >
                                {SETTLEMENT_BENEFIT_OPTIONS.map(option => (
                                    <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className={styles.errorMessage} style={{ color: '#9ca3af' }}>
                                Opcional. Pode coexistir com a Proposta Inicial (R$).
                            </span>
                        </div>
                        {settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.OUROCAP && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Valor Ourocap (mínimo R$ 500,00)</label>
                                <input
                                    className={`${styles.input} ${errors.ourocap_value ? styles.errorInput : ''}`}
                                    type="number"
                                    step="0.01"
                                    min={OUROCAP_MIN_VALUE}
                                    name="ourocap_value"
                                    value={formData.ourocap_value}
                                    onChange={handleChange}
                                />
                                {errors.ourocap_value && <span className={styles.errorMessage}>{errors.ourocap_value}</span>}
                            </div>
                        )}
                        {settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.LIVELO && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Pontos Livelo (mínimo 5.000)</label>
                                <input
                                    className={`${styles.input} ${errors.livelo_points ? styles.errorInput : ''}`}
                                    type="number"
                                    step="1"
                                    min={LIVELO_MIN_POINTS}
                                    name="livelo_points"
                                    value={formData.livelo_points}
                                    onChange={handleChange}
                                />
                                {errors.livelo_points && <span className={styles.errorMessage}>{errors.livelo_points}</span>}
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valor da PCOND (R$)</label>
                            <input className={styles.input} type="number" step="0.01" name="pcond_probability" value={formData.pcond_probability} onChange={handleChange} />
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

                    <div style={{ marginTop: '1rem' }}>
                        <AgreementChecklist 
                            checklistData={formData.agreement_checklist_data} 
                            onUpdate={handleChecklistUpdate}
                        />
                    </div>
                </section>
                
                {/* 6. ETIQUETAS (Tags) */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><IconChecklist /></div>
                        <h2>Etiquetas</h2>
                    </div>

                    {savedTags.length > 0 && (
                        <div className={styles.tagCreator}>
                            <select
                                className={styles.tagInput}
                                value={selectedSavedTagText}
                                onChange={(e) => setSelectedSavedTagText(e.target.value)}
                            >
                                <option value="">Replicar etiqueta salva...</option>
                                {savedTags.map((tag) => (
                                    <option key={`${tag.text || tag.name}-${tag.color}`} value={tag.text || tag.name}>
                                        {tag.text || tag.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className={styles.addButton}
                                onClick={handleAddSavedTag}
                                disabled={!selectedSavedTagText}
                            >
                                Replicar
                            </button>
                        </div>
                    )}
                    
                    <div className={styles.tagCreator}>
                       <input type="text" className={styles.tagInput} value={newTagText} onChange={(e) => setNewTagText(e.target.value)} placeholder="Nova etiqueta..." />
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
                </section>

                <div className={styles.footer}>
                    <button type="button" className={styles.cancelButton} onClick={() => navigate(-1)}>Cancelar</button>
                    <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                        <IconSave /> {isSubmitting ? 'Salvando...' : 'Criar Caso'}
                    </button>
                </div>
            </form>

            {/* Modal de Criação Advogado */}
            {isLawyerModalOpen && (
                <AddEditOpposingLawyerModal 
                    onClose={() => setIsLawyerModalOpen(false)}
                    onSuccess={handleLawyerCreated}
                    initialName={lawyerSearchTerm}
                />
            )}

            {/* Modal de Listagem Advogado */}
            {isListModalOpen && (
                <OpposingLawyerListModal
                    onClose={() => setIsListModalOpen(false)}
                    onSelect={handleSelectLawyer}
                />
            )}

            {isActionObjectModalOpen && (
                <AddEditActionObjectModal
                    onClose={() => setIsActionObjectModalOpen(false)}
                    onSuccess={handleActionObjectSaved}
                    initialName={actionObjectSearchTerm}
                />
            )}

            {isActionObjectListModalOpen && (
                <ActionObjectListModal
                    onClose={() => setIsActionObjectListModalOpen(false)}
                    onSelect={handleSelectActionObject}
                />
            )}

            {/* Modal de Criação Autor (NOVO) */}
            {isPlaintiffModalOpen && (
                <AddEditPlaintiffModal 
                    onClose={() => setIsPlaintiffModalOpen(false)}
                    onSuccess={handlePlaintiffCreated}
                    initialName={plaintiffSearchTerm}
                />
            )}

            {/* Modal de Criação Réu (NOVO) */}
            {isDefendantModalOpen && (
                <AddEditDefendantModal 
                    onClose={() => setIsDefendantModalOpen(false)}
                    onSuccess={handleDefendantCreated}
                    initialName={defendantSearchTerm}
                />
            )}
        </div>
    );
};

export default CaseCreatePage;
