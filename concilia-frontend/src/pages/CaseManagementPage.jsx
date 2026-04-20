// src/pages/CaseManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaPlus, FaSearch, FaEye, FaEdit, FaTrash, 
    FaCheckSquare, FaTrashAlt, FaTimes, 
    FaGavel, FaExclamationCircle, FaUserTag,
    FaChevronLeft, FaChevronRight,
    FaSort, FaSortUp, FaSortDown, FaSlidersH, FaEraser, FaTag
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import EditCaseModal from '../components/EditCaseModal';
import SavedCaseTagsPanel from '../components/SavedCaseTagsPanel';
import styles from '../styles/CaseManagement.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import IndicationChecklistModal from '../components/IndicationChecklistModal';
import {
    LEGAL_CASE_STATUS_OPTIONS,
    getLegalCaseStatusDetails,
    UNASSIGNED_RESPONSIBLE_VALUE,
} from '../constants/legalCaseStatus';
import { canAccessCaseCreation, isIndicatorRole, normalizeUserRole } from '../constants/access';
import { formatLiveloPoints } from '../constants/settlementBenefit';

// --- COMPONENTES AUXILIARES ---

const PRIORITY_DETAILS = {
    'alta': { name: 'Alta', color: '#e53e3e', textColor: '#FFFFFF' },
    'media': { name: 'Média', color: '#dd6b20', textColor: '#FFFFFF' },
    'baixa': { name: 'Baixa', color: '#38a169', textColor: '#FFFFFF' },
};

const PRIORITY_OPTIONS = Object.entries(PRIORITY_DETAILS).map(([value, details]) => ({
    value,
    name: details.name,
}));

const MULTI_CASE_NUMBER_MIN_DIGITS = 15;
const CASE_NUMBER_TOKEN_PATTERN = /^[0-9./-]+$/;
const INITIAL_FILTERS = {
    search: '',
    action_object: '',
    status: '',
    priority: '',
    tag: '',
    lawyer_id: '',
    indicator_user_id: '',
};

const extractMultipleCaseNumberTerms = (value) => {
    const trimmedValue = String(value || '').trim();

    if (!trimmedValue) {
        return [];
    }

    const rawParts = trimmedValue
        .split(/[\s,;]+/)
        .map((part) => part.trim().replace(/^["']+|["']+$/g, ''))
        .filter(Boolean);

    if (rawParts.length < 2) {
        return [];
    }

    const normalizedTerms = [];
    const seenTerms = new Set();

    for (const part of rawParts) {
        if (!CASE_NUMBER_TOKEN_PATTERN.test(part)) {
            return [];
        }

        const normalizedDigits = part.replace(/\D/g, '');

        if (normalizedDigits.length < MULTI_CASE_NUMBER_MIN_DIGITS) {
            return [];
        }

        if (seenTerms.has(normalizedDigits)) {
            continue;
        }

        seenTerms.add(normalizedDigits);
        normalizedTerms.push(normalizedDigits);
    }

    return normalizedTerms;
};

const formatProcessCount = (count) => `${count} ${count === 1 ? 'processo' : 'processos'}`;

const StatusTag = ({ status }) => {
    const currentStatus = getLegalCaseStatusDetails(status);
    return <span className={styles.statusTag} style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}>{currentStatus.name}</span>;
};

const PriorityTag = ({ priority }) => {
    const currentPriority = PRIORITY_DETAILS[priority] || { name: priority, color: '#A0AEC0', textColor: '#1A202C' };
    return <span className={styles.priorityTag} style={{ backgroundColor: currentPriority.color, color: currentPriority.textColor }}>{currentPriority.name}</span>;
};

const getDisplayName = (value, fallback = '-') => {
    if (!value) return fallback;
    if (typeof value === 'string' || typeof value === 'number') {
        const normalizedValue = String(value).trim();
        return normalizedValue || fallback;
    }
    return value.name || value.nome || fallback;
};

const getResponsibleName = (legalCase) => getDisplayName(
    legalCase?.agreement_checklist_data?.indication_checklist?.assigned_operator || legalCase?.lawyer,
    'Sem operador'
);

const getIndicatorName = (legalCase) => getDisplayName(
    legalCase?.indicator
    || legalCase?.agreement_checklist_data?.indication_checklist?.indicator
    || legalCase?.agreement_checklist_data?.indication_checklist?.completed_by,
    ''
);

const hasFilledValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const renderSettlementTerms = (legalCase, formatCurrency) => {
    const rows = [];
    const agreementValue = Number.parseFloat(legalCase?.agreement_value);
    const ourocapValue = Number.parseFloat(legalCase?.ourocap_value);

    if (Number.isFinite(agreementValue) && agreementValue > 0) {
        rows.push(`Acordo: ${formatCurrency(agreementValue)}`);
    }

    if (Number.isFinite(ourocapValue) && ourocapValue > 0) {
        rows.push(`Ourocap: ${formatCurrency(ourocapValue)}`);
    }

    if (hasFilledValue(legalCase?.livelo_points)) {
        rows.push(`Livelo: ${formatLiveloPoints(legalCase.livelo_points)} pontos`);
    }

    if (rows.length === 0) {
        return null;
    }

    return rows.map((row) => (
        <div key={row} style={{ color: '#38a169', fontSize: '0.8rem' }}>
            {row}
        </div>
    ));
};

const CaseManagementPage = () => {
    // Adicionado 'user' para verificar a role
    const { token, user } = useAuth();
    const normalizedUserRole = normalizeUserRole(user?.role);
    const isIndicator = isIndicatorRole(user?.role);
    const canUseBatchActions = !isIndicator;
    const canDeleteCases = ['administrador', 'admin'].includes(normalizedUserRole);
    const canManageSavedTags = ['administrador', 'admin'].includes(normalizedUserRole);
    
    const [cases, setCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [clients, setClients] = useState([]); 
    const [savedTags, setSavedTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchFeedback, setSearchFeedback] = useState(null);
    const [editingCase, setEditingCase] = useState(null);
    const [indicationCase, setIndicationCase] = useState(null);

    // --- PAGINAÇÃO (ESTADOS) ---
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50); 
    const [paginationData, setPaginationData] = useState({
        last_page: 1,
        total: 0,
        from: 0,
        to: 0
    });

    // --- ORDENAÇÃO ---
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    // --- ESTADOS DE AÇÃO EM LOTE ---
    const [selectedCaseIds, setSelectedCaseIds] = useState([]);
    const [batchActionType, setBatchActionType] = useState(null); 
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    const [filters, setFilters] = useState(INITIAL_FILTERS);

    // Carrega dados de apoio
    useEffect(() => {
        const fetchDropdownData = async () => {
            if (!token) return;
            try {
                const requests = [
                    apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/case-tags', { headers: { Authorization: `Bearer ${token}` } }),
                ];

                if (!isIndicator) {
                    requests.unshift(
                        apiClient.get('/users/operators', { headers: { Authorization: `Bearer ${token}` } }),
                        apiClient.get('/users/indicators', { headers: { Authorization: `Bearer ${token}` } })
                    );
                }

                const responses = await Promise.all(requests);
                const usersResponse = isIndicator ? null : responses[0];
                const indicatorsResponse = isIndicator ? null : responses[1];
                const clientsResponse = isIndicator ? responses[0] : responses[2];
                const caseTagsResponse = isIndicator ? responses[1] : responses[3];

                setLawyers(Array.isArray(usersResponse?.data) ? usersResponse.data : []);
                setIndicators(Array.isArray(indicatorsResponse?.data) ? indicatorsResponse.data : []);
                setClients(clientsResponse.data || []);
                setSavedTags(Array.isArray(caseTagsResponse?.data) ? caseTagsResponse.data : []);
            } catch (err) { 
                console.error("Erro ao buscar dados de apoio", err); 
            }
        };
        fetchDropdownData();
    }, [token, isIndicator]);

    // Carrega Casos
    const fetchCases = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        setSearchFeedback(null);
        
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
            
            // Adiciona paginação
            params.append('page', currentPage);
            params.append('per_page', perPage);

            // Adiciona ordenação
            params.append('sort_by', sortConfig.key);
            params.append('sort_order', sortConfig.direction);

            const response = await apiClient.get(`/cases?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            
            if (response.data && response.data.data) {
                setCases(response.data.data);
                setSearchFeedback(response.data.search_feedback || null);
                setPaginationData({
                    last_page: response.data.last_page,
                    total: response.data.total,
                    from: response.data.from,
                    to: response.data.to
                });
            } else {
                setCases(response.data);
                setSearchFeedback(null);
            }

        } catch (err) {
            setError('Não foi possível carregar os casos.');
            setSearchFeedback(null);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filters, currentPage, perPage, sortConfig]);

    // Reseta para página 1 se mudar filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchCases(); }, 500);
        return () => clearTimeout(timer);
    }, [fetchCases]);

    useEffect(() => {
        if (!Array.isArray(selectedCaseIds) || selectedCaseIds.length === 0) {
            setBatchActionType(null);
        }
    }, [selectedCaseIds]);

    // --- MANIPULADORES DE ORDENAÇÃO ---
    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <FaSort style={{marginLeft:'5px', color:'#A0AEC0', fontSize:'0.8rem'}} />;
        return sortConfig.direction === 'asc' 
            ? <FaSortUp style={{marginLeft:'5px', color:'#4a5568', fontSize:'0.8rem'}} /> 
            : <FaSortDown style={{marginLeft:'5px', color:'#4a5568', fontSize:'0.8rem'}} />;
    };

    // --- MANIPULADORES GERAIS ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ ...INITIAL_FILTERS });
    };

    const handleSelectSavedTagFilter = (tag) => {
        const tagText = tag?.text || tag?.name || '';
        setFilters((prev) => ({
            ...prev,
            tag: prev.tag === tagText ? '' : tagText,
        }));
    };

    const handleDeleteSavedTag = async (tagToDelete) => {
        if (!tagToDelete?.id) {
            return;
        }

        const confirmed = window.confirm(
            `Tem certeza que deseja excluir a etiqueta "${tagToDelete.text || tagToDelete.name}"?\n\nEssa ação removerá a etiqueta do catálogo e de todos os casos que a utilizam.`
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await apiClient.delete(`/case-tags/${tagToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setSavedTags((currentTags) => currentTags.filter((tag) => tag.id !== tagToDelete.id));
            setFilters((prev) => ({
                ...prev,
                tag: prev.tag === (tagToDelete.text || tagToDelete.name) ? '' : prev.tag,
            }));
            window.alert(response.data?.message || 'Etiqueta excluída com sucesso.');
            fetchCases();
        } catch (err) {
            console.error('Erro ao excluir etiqueta salva:', err);
            window.alert(err.response?.data?.message || 'Não foi possível excluir a etiqueta.');
        }
    };

    const handleSelectAll = (e) => {
        const visibleIds = cases.map((legalCase) => legalCase.id).filter(Boolean);

        if (e.target.checked) {
            setSelectedCaseIds(prev => Array.from(new Set([...(Array.isArray(prev) ? prev : []), ...visibleIds])));
        } else {
            setSelectedCaseIds(prev => (Array.isArray(prev) ? prev : []).filter(id => !visibleIds.includes(id)));
        }
    };

    const handleSelectCase = (id) => {
        if (!id) return;
        setSelectedCaseIds(prev => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.includes(id)) {
                return list.filter(cId => cId !== id);
            }
            return [...list, id];
        });
    };

    const executeBatchUpdate = async (action, value) => {
        const isUnassignTransfer = action === 'transfer_user' && value === UNASSIGNED_RESPONSIBLE_VALUE;
        if ((!value || value === '') && action !== 'delete' && !isUnassignTransfer) return;

        const confirmMessage = action === 'delete'
            ? `Tem certeza que deseja excluir ${selectedCaseIds.length} ${selectedCaseIds.length === 1 ? 'processo selecionado' : 'processos selecionados'}?\n\nEssa ação não pode ser desfeita e removerá os casos definitivamente.`
            : `Aplicar alteração em ${selectedCaseIds.length} ${selectedCaseIds.length === 1 ? 'processo selecionado' : 'processos selecionados'}?`;

        if (!window.confirm(confirmMessage)) return;

        setIsBatchProcessing(true);
        try {
            await apiClient.post('/cases/batch-update', {
                case_ids: selectedCaseIds,
                action: action,
                value: value
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('Ação em lote concluída!');
            setSelectedCaseIds([]);
            setBatchActionType(null);
            fetchCases(); 
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || 'Erro ao processar lote.');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleDeleteCase = async (legalCase) => {
        const caseLabel = legalCase?.case_number || `#${legalCase?.id}`;
        const confirmMessage = `Tem certeza que deseja excluir o processo ${caseLabel}?\n\nEssa ação não pode ser desfeita.`;

        if (window.confirm(confirmMessage)) {
            try {
                await apiClient.delete(`/cases/${legalCase.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setCases(prev => prev.filter(c => c.id !== legalCase.id));
                setSelectedCaseIds(prev => (Array.isArray(prev) ? prev : []).filter(id => id !== legalCase.id));
            } catch (err) {
                alert(err?.response?.data?.message || 'Erro ao excluir.');
            }
        }
    };

    const handleCaseIndicated = () => {
        setIndicationCase(null);
        fetchCases();
    };

    const formatValue = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    
    const kpis = {
        total_cases: paginationData.total || cases.length,
        total_cause_value: cases.reduce((acc, c) => acc + (parseFloat(c.cause_value) || 0), 0),
        total_agreement_value: cases.reduce((acc, c) => acc + (parseFloat(c.agreement_value) || 0), 0),
        total_economy: cases.reduce((acc, c) => {
            const orig = parseFloat(c.original_value);
            const agree = parseFloat(c.agreement_value);
            return (orig > 0 && agree > 0) ? acc + (orig - agree) : acc;
        }, 0)
    };

    const visibleCaseIds = cases.map((legalCase) => legalCase.id).filter(Boolean);
    const selectedVisibleCaseIds = (Array.isArray(selectedCaseIds) ? selectedCaseIds : []).filter((id) =>
        visibleCaseIds.includes(id)
    );
    const selectedHiddenCount = Math.max((selectedCaseIds?.length || 0) - selectedVisibleCaseIds.length, 0);
    const isAllSelected =
        visibleCaseIds.length > 0 && selectedVisibleCaseIds.length === visibleCaseIds.length;
    const selectedLawyer = lawyers.find(lawyer => String(lawyer.id) === String(filters.lawyer_id));
    const selectedLawyerName = filters.lawyer_id === UNASSIGNED_RESPONSIBLE_VALUE
        ? 'Sem responsável'
        : selectedLawyer?.name;
    const selectedIndicator = indicators.find(indicator => String(indicator.id) === String(filters.indicator_user_id));
    const selectedTagName = savedTags.find((tag) => String(tag.id) === String(filters.tag) || (tag.text || tag.name) === filters.tag)?.text
        || savedTags.find((tag) => String(tag.id) === String(filters.tag) || (tag.text || tag.name) === filters.tag)?.name;
    const activeFilterChips = [];
    const pastedCaseNumberTerms = extractMultipleCaseNumberTerms(filters.search);
    const trimmedActionObject = filters.action_object.trim();

    if (filters.search.trim()) {
        activeFilterChips.push({
            key: 'search',
            label: pastedCaseNumberTerms.length > 1
                ? `Busca: ${formatProcessCount(pastedCaseNumberTerms.length)}`
                : `Busca: ${filters.search.trim()}`,
        });
    }

    if (trimmedActionObject) {
        activeFilterChips.push({
            key: 'action_object',
            label: `Causa de pedir: ${trimmedActionObject}`,
        });
    }

    if (filters.status) {
        activeFilterChips.push({
            key: 'status',
            label: `Status: ${getLegalCaseStatusDetails(filters.status).name}`,
        });
    }

    if (filters.priority) {
        activeFilterChips.push({
            key: 'priority',
            label: `Prioridade: ${PRIORITY_DETAILS[filters.priority]?.name || filters.priority}`,
        });
    }

    if (filters.tag) {
        activeFilterChips.push({
            key: 'tag',
            label: `Etiqueta: ${selectedTagName || filters.tag}`,
        });
    }

    if (!isIndicator && filters.lawyer_id) {
        activeFilterChips.push({
            key: 'lawyer_id',
            label: `Responsável: ${selectedLawyerName || 'Selecionado'}`,
        });
    }

    if (!isIndicator && filters.indicator_user_id) {
        activeFilterChips.push({
            key: 'indicator_user_id',
            label: `Indicador: ${selectedIndicator?.name || 'Selecionado'}`,
        });
    }

    const activeFilterCount = activeFilterChips.length;
    const trimmedSearch = filters.search.trim();
    const emptyStateContent = (() => {
        if (cases.length > 0) {
            return null;
        }

        if (searchFeedback?.type === 'case_number_not_found') {
            return {
                title: `O processo ${searchFeedback.search} não consta na base de dados.`,
                description: 'Confira o número informado e, se necessário, solicite o cadastro do processo antes de tentar a indicação.',
            };
        }

        if (searchFeedback?.type === 'case_number_list_not_found') {
            const totalTerms = Number(searchFeedback.total_terms || pastedCaseNumberTerms.length || 0);

            return {
                title: `Nenhum dos ${formatProcessCount(totalTerms)} informados consta na base de dados.`,
                description: 'Cole a lista novamente, revise os números e, se necessário, solicite o cadastro dos processos antes de tentar a transferência.',
            };
        }

        if (searchFeedback?.type === 'case_number_unavailable_for_indicator') {
            return {
                title: `O processo ${searchFeedback.search} foi localizado, mas não está disponível para indicação.`,
                description: 'O perfil Indicador visualiza apenas casos da fila de Análise Inicial que atendem aos filtros atuais.',
            };
        }

        if (searchFeedback?.type === 'case_number_list_unavailable_for_indicator') {
            const totalTerms = Number(searchFeedback.total_terms || pastedCaseNumberTerms.length || 0);
            const matchedCount = Number(searchFeedback.matched_count || 0);
            const missingCount = Number(searchFeedback.missing_count || Math.max(totalTerms - matchedCount, 0));

            return {
                title: `Encontramos ${formatProcessCount(matchedCount)} da lista, mas nenhum está disponível para indicação.`,
                description: missingCount > 0
                    ? `${formatProcessCount(missingCount)} não foram localizados e os demais não entram na fila atual de Análise Inicial.`
                    : 'Os processos encontrados não entram na fila atual de Análise Inicial.',
            };
        }

        if (searchFeedback?.type === 'case_number_filtered_out') {
            return {
                title: `O processo ${searchFeedback.search} foi localizado, mas não aparece na lista atual.`,
                description: 'Revise os filtros aplicados para verificar se eles estão restringindo a visualização do processo.',
            };
        }

        if (searchFeedback?.type === 'case_number_list_filtered_out') {
            const totalTerms = Number(searchFeedback.total_terms || pastedCaseNumberTerms.length || 0);
            const matchedCount = Number(searchFeedback.matched_count || 0);
            const missingCount = Number(searchFeedback.missing_count || Math.max(totalTerms - matchedCount, 0));

            return {
                title: `Encontramos ${formatProcessCount(matchedCount)} da lista, mas eles não aparecem com os filtros atuais.`,
                description: missingCount > 0
                    ? `${formatProcessCount(missingCount)} não foram localizados na base. Revise os filtros para exibir os processos encontrados.`
                    : 'Revise os filtros aplicados para exibir os processos encontrados.',
            };
        }

        if (trimmedSearch) {
            return {
                title: 'Nenhum caso encontrado para a busca informada.',
                description: isIndicator
                    ? 'Tente outro número de processo ou limpe os filtros para voltar a visualizar os casos disponíveis para indicação.'
                    : 'Ajuste a busca ou limpe os filtros para carregar novamente a carteira.',
            };
        }

        if (activeFilterCount > 0) {
            return {
                title: 'Nenhum caso corresponde aos filtros atuais.',
                description: 'Remova alguns filtros para ampliar a lista de resultados.',
            };
        }

        if (isIndicator) {
            return {
                title: 'Nenhum caso disponível para indicação no momento.',
                description: 'Quando houver processos em Análise Inicial aptos para a sua fila, eles aparecerão aqui.',
            };
        }

        return {
            title: 'Nenhum caso encontrado.',
            description: 'Ajuste os filtros ou tente novamente em alguns instantes.',
        };
    })();

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div><h1>Gestão de Casos</h1><p>Gerencie todos os casos direcionados para o escritório</p></div>
                <div className={styles.headerActions}>
                    {canAccessCaseCreation(user?.role) && (
                        <Link to="/cases/create" className={styles.newCaseButton}><FaPlus /> Novo Caso</Link>
                    )}
                </div>
            </header>

            {isIndicator && (
                <section className={styles.indicatorNotice}>
                    <div className={styles.indicatorNoticeLabel}>Fluxo de indicação</div>
                    <div className={styles.indicatorNoticeTitle}>Fila pronta para triagem inicial</div>
                    <p className={styles.indicatorNoticeText}>
                        Esta fila mostra os casos em Análise Inicial disponíveis para indicação de acordo.
                    </p>
                </section>
            )}
            
            <section className={styles.kpiGrid}>
                <KpiCard title="Total (Geral)" value={kpis.total_cases.toString()} />
                <KpiCard title="Selecionados" value={selectedCaseIds?.length?.toString() || '0'} />
                <KpiCard title="Acordos (Pág.)" value={formatValue(kpis.total_agreement_value)} />
                <KpiCard title="Economia (Pág.)" value={formatValue(kpis.total_economy)} />
            </section>

            <section className={styles.filtersContainer}>
                <div className={styles.filtersHeader}>
                    <div className={styles.filtersTitleBlock}>
                        <div className={styles.filtersIcon}>
                            <FaSlidersH />
                        </div>
                        <div className={styles.filtersHeading}>
                            <h3>Filtros da Gestão</h3>
                            <p>Refine a carteira por causa de pedir, status, prioridade, etiqueta, responsável e indicador enquanto a tabela atualiza automaticamente.</p>
                        </div>
                    </div>
                    <span className={styles.filterCount}>
                        {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                    </span>
                </div>

                <div className={styles.filterGrid}>
                    <label className={`${styles.filterField} ${styles.searchField}`}>
                        <span className={styles.filterLabel}>
                            <FaSearch />
                            Busca rápida
                        </span>
                        <input
                            type="text"
                            placeholder="Cole um ou vários processos, cliente ou palavra-chave"
                            className={styles.filterControl}
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            title="Voce pode colar varios numeros de processo separados por espaco ou quebra de linha."
                        />
                        <small className={styles.filterHelp}>
                            Cole varios numeros de processo separados por espaco ou quebra de linha.
                        </small>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaGavel />
                            Causa de Pedir
                        </span>
                        <input
                            type="text"
                            placeholder="Digite a causa de pedir"
                            className={styles.filterControl}
                            name="action_object"
                            value={filters.action_object}
                            onChange={handleFilterChange}
                        />
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaCheckSquare />
                            Status
                        </span>
                        <select className={styles.filterControl} name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">Todos os status</option>
                            {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => (
                                <option key={statusOption.value} value={statusOption.value}>
                                    {statusOption.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaExclamationCircle />
                            Prioridade
                        </span>
                        <select className={styles.filterControl} name="priority" value={filters.priority} onChange={handleFilterChange}>
                            <option value="">Todas as prioridades</option>
                            {PRIORITY_OPTIONS.map((priorityOption) => (
                                <option key={priorityOption.value} value={priorityOption.value}>
                                    {priorityOption.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaTag />
                            Etiqueta
                        </span>
                        <select className={styles.filterControl} name="tag" value={filters.tag} onChange={handleFilterChange}>
                            <option value="">Todas as etiquetas</option>
                            {savedTags.map((tag) => (
                                <option key={tag.id || `${tag.text || tag.name}-${tag.color}`} value={tag.text || tag.name}>
                                    {tag.text || tag.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {!isIndicator && (
                        <>
                            <label className={styles.filterField}>
                                <span className={styles.filterLabel}>
                                    <FaUserTag />
                                    Responsável do caso
                                </span>
                                <select className={styles.filterControl} name="lawyer_id" value={filters.lawyer_id} onChange={handleFilterChange}>
                                    <option value="">Todos os responsáveis</option>
                                    <option value={UNASSIGNED_RESPONSIBLE_VALUE}>Sem responsável</option>
                                    {lawyers.map((lawyer) => (
                                        <option key={lawyer.id} value={lawyer.id}>
                                            {lawyer.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className={styles.filterField}>
                                <span className={styles.filterLabel}>
                                    <FaUserTag />
                                    Indicador
                                </span>
                                <select className={styles.filterControl} name="indicator_user_id" value={filters.indicator_user_id} onChange={handleFilterChange}>
                                    <option value="">Todos os indicadores</option>
                                    {indicators.map((indicator) => (
                                        <option key={indicator.id} value={indicator.id}>
                                            {indicator.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </>
                    )}
                </div>

                <SavedCaseTagsPanel
                    tags={savedTags}
                    title="Etiquetas salvas"
                    subtitle="Clique para aplicar rapidamente no filtro. Administradores podem excluir etiquetas do catálogo por aqui."
                    onSelectTag={handleSelectSavedTagFilter}
                    onDeleteTag={handleDeleteSavedTag}
                    canDelete={canManageSavedTags}
                    selectedValue={filters.tag}
                    selectionMode="filter"
                    compact
                    emptyMessage="Nenhuma etiqueta salva cadastrada até o momento."
                />

                <div className={styles.filtersFooter}>
                    <div className={styles.filtersSummary}>
                        {activeFilterCount > 0 ? (
                            activeFilterChips.map((chip) => (
                                <span key={chip.key} className={styles.filterChip}>
                                    {chip.label}
                                </span>
                            ))
                        ) : (
                            <span className={styles.filtersHint}>
                                Sem filtros adicionais no momento. A lista mostra todos os casos da fila atual.
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.clearFiltersButton}
                        onClick={handleClearFilters}
                        disabled={activeFilterCount === 0}
                    >
                        <FaEraser />
                        Limpar filtros
                    </button>
                </div>
            </section>
            
            <section className={styles.tableContainer}>
                {loading ? <p>Carregando...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
                    <>
                        {/* --- CONTROLES DE PAGINAÇÃO (TOPO) --- */}
                        <div className={styles.paginationTopBar}>
                            <div className={styles.paginationInfoText}>
                                Exibindo {paginationData.from || 0}-{paginationData.to || 0} de {paginationData.total || 0} resultados
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={styles.paginationInfoText}>Exibir:</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setCurrentPage(1); 
                                    }}
                                    className={styles.perPageSelect}
                                >
                                    <option value="15">15</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                            </div>
                        </div>

                        {cases.length > 0 ? (
                            <>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            {canUseBatchActions && (
                                                <th style={{width: '40px', textAlign: 'center'}}>
                                                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className={styles.checkboxInput} />
                                                </th>
                                            )}
                                            
                                            <th style={{cursor:'pointer', userSelect:'none'}} onClick={() => handleSort('id')}>
                                                ID/Processo {getSortIcon('id')}
                                            </th>
                                            <th>Cliente/Local</th>
                                            <th>Partes</th>
                                            <th style={{cursor:'pointer', userSelect:'none'}} onClick={() => handleSort('cause_value')}>
                                                Valores {getSortIcon('cause_value')}
                                            </th>
                                            <th style={{cursor:'pointer', userSelect:'none'}} onClick={() => handleSort('priority')}>
                                                Status/Prioridade {getSortIcon('priority')}
                                            </th>
                                            
                                            <th>Responsável / Indicador</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cases.map(legalCase => (
                                            <tr key={legalCase.id} className={Array.isArray(selectedCaseIds) && selectedCaseIds.includes(legalCase.id) ? styles.rowSelected : ''}>
                                                {canUseBatchActions && (
                                                    <td style={{textAlign: 'center'}}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={Array.isArray(selectedCaseIds) && selectedCaseIds.includes(legalCase.id)} 
                                                            onChange={() => handleSelectCase(legalCase.id)}
                                                            className={styles.checkboxInput}
                                                        />
                                                    </td>
                                                )}
                                                <td>
                                                    <Link to={`/cases/${legalCase.id}`} className={styles.caseLink}>{legalCase.id}</Link>
                                                    <div className={styles.subText}>{legalCase.case_number}</div>
                                                </td>
                                                <td>
                                                    <div>{legalCase.client?.name || '-'}</div>
                                                    <div className={styles.subText}>{legalCase.comarca}</div>
                                                </td>
                                                <td>
                                                    <div><small>A:</small> {legalCase.opposing_party}</div>
                                                    <div className={styles.subText}><small>R:</small> {legalCase.defendant}</div>
                                                </td>
                                                <td>
                                                    <div>{formatValue(legalCase.cause_value)}</div>
                                                    {renderSettlementTerms(legalCase, formatValue)}
                                                </td>
                                                <td>
                                                    <div style={{marginBottom:'4px'}}><StatusTag status={legalCase.status} /></div>
                                                    <PriorityTag priority={legalCase.priority} />
                                                </td>
                                                <td>
                                                    <div>{getResponsibleName(legalCase)}</div>
                                                    <div className={styles.subText}>
                                                        {getIndicatorName(legalCase) ? `Indicador: ${getIndicatorName(legalCase)}` : 'Sem indicador'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <Link to={`/cases/${legalCase.id}`} className={styles.actionIcon}><FaEye /></Link>
                                                        {!isIndicator && (
                                                            <span className={styles.actionIcon} onClick={() => setEditingCase(legalCase)}><FaEdit /></span>
                                                        )}
                                                        {isIndicator && legalCase.status === 'initial_analysis' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setIndicationCase(legalCase)}
                                                                className={styles.indicateButton}
                                                            >
                                                                Indicar caso para acordo
                                                            </button>
                                                        )}
                                                        
                                                        {/* SÓ MOSTRA SE FOR ADMIN */}
                                                        {canDeleteCases && !isIndicator && (
                                                            <span className={styles.actionIcon} onClick={() => handleDeleteCase(legalCase)}>
                                                                <FaTrash />
                                                            </span>
                                                        )}

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* --- CONTROLES DE PAGINAÇÃO (RODAPÉ) --- */}
                                <div className={styles.paginationFooter}>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={styles.paginationBtn}
                                    >
                                        <FaChevronLeft /> Anterior
                                    </button>

                                    <span className={styles.paginationPageInfo}>
                                        Página {currentPage} de {paginationData.last_page || 1}
                                    </span>

                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(paginationData.last_page, p + 1))}
                                        disabled={currentPage >= paginationData.last_page}
                                        className={styles.paginationBtn}
                                    >
                                        Próxima <FaChevronRight />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <FaGavel />
                                </div>
                                <div className={styles.emptyStateContent}>
                                    <h3>{emptyStateContent?.title}</h3>
                                    <p>{emptyStateContent?.description}</p>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        className={styles.emptyStateAction}
                                        onClick={handleClearFilters}
                                    >
                                        <FaEraser />
                                        Limpar filtros
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* --- BARRA FLUTUANTE DE AÇÕES EM LOTE --- */}
            {canUseBatchActions && Array.isArray(selectedCaseIds) && selectedCaseIds.length > 0 && (
                <div className={styles.batchActionBar}>
                    <div className={styles.batchInfo}>
                        <strong>{selectedCaseIds.length}</strong> selecionados
                        <span className={styles.batchSubInfo}>
                            {selectedVisibleCaseIds.length} na lista atual
                            {selectedHiddenCount > 0 ? ` • ${selectedHiddenCount} fora do filtro` : ''}
                        </span>
                    </div>
                    <div className={styles.batchActions}>
                        
                        {!batchActionType ? (
                            <>
                                <button className={`${styles.batchBtn} ${styles.btnInfo}`} onClick={() => setBatchActionType('status')}>
                                    <FaCheckSquare /> Status
                                </button>
                                <button className={`${styles.batchBtn} ${styles.btnWarning}`} onClick={() => setBatchActionType('priority')}>
                                    <FaExclamationCircle /> Prioridade
                                </button>
                                <button className={`${styles.batchBtn} ${styles.btnSuccess}`} onClick={() => setBatchActionType('lawyer')}>
                                    <FaUserTag /> Transferir
                                </button>
                                
                                {/* SÓ MOSTRA SE FOR ADMIN */}
                                {canDeleteCases && (
                                    <button
                                        className={`${styles.batchBtn} ${styles.btnDanger}`}
                                        onClick={() => executeBatchUpdate('delete')}
                                        disabled={isBatchProcessing}
                                    >
                                        <FaTrashAlt /> Excluir
                                    </button>
                                )}
                            </>
                        ) : (
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <span style={{fontSize:'0.9rem'}}>Selecione:</span>
                                
                                {batchActionType === 'status' && (
                                    <select className={styles.batchSelect} onChange={(e) => executeBatchUpdate('update_status', e.target.value)} defaultValue="">
                                        <option value="" disabled>Novo Status...</option>
                        {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>)}
                                    </select>
                                )}

                                {batchActionType === 'priority' && (
                                    <select className={styles.batchSelect} onChange={(e) => executeBatchUpdate('update_priority', e.target.value)} defaultValue="">
                                        <option value="" disabled>Nova Prioridade...</option>
                                        <option value="alta">Alta</option>
                                        <option value="media">Média</option>
                                        <option value="baixa">Baixa</option>
                                    </select>
                                )}

                                {batchActionType === 'lawyer' && (
                                    <select className={styles.batchSelect} onChange={(e) => executeBatchUpdate('transfer_user', e.target.value)} defaultValue="">
                                        <option value="" disabled>Novo Responsável...</option>
                                        <option value={UNASSIGNED_RESPONSIBLE_VALUE}>Sem responsável</option>
                                        {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                )}

                                <button className={styles.batchCancelBtn} onClick={() => setBatchActionType(null)}>Cancelar</button>
                            </div>
                        )}

                        <button
                            className={styles.batchClose}
                            onClick={() => {
                                setSelectedCaseIds([]);
                                setBatchActionType(null);
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            <IndicationChecklistModal
                isOpen={Boolean(indicationCase)}
                legalCase={indicationCase}
                onClose={() => setIndicationCase(null)}
                onSuccess={handleCaseIndicated}
            />

            {editingCase && (
                <EditCaseModal 
                    legalCase={editingCase}
                    onClose={() => setEditingCase(null)}
                    onCaseUpdated={fetchCases}
                    clients={clients}
                    lawyers={lawyers}
                />
            )}
        </div>
    );
};

export default CaseManagementPage;
