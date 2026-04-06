// src/pages/CaseManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaPlus, FaSearch, FaEye, FaEdit, FaTrash, 
    FaCheckSquare, FaTrashAlt, FaTimes, 
    FaGavel, FaExclamationCircle, FaUserTag,
    FaChevronLeft, FaChevronRight,
    FaSort, FaSortUp, FaSortDown, FaSlidersH, FaEraser
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import EditCaseModal from '../components/EditCaseModal';
import styles from '../styles/CaseManagement.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import IndicationChecklistModal from '../components/IndicationChecklistModal';
import {
    LEGAL_CASE_STATUS_OPTIONS,
    getLegalCaseStatusDetails,
} from '../constants/legalCaseStatus';
import { canAccessCaseCreation, isIndicatorRole } from '../constants/access';
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

const INITIAL_FILTERS = {
    search: '',
    status: '',
    priority: '',
    lawyer_id: '',
};

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
    const isIndicator = isIndicatorRole(user?.role);
    const canUseBatchActions = !isIndicator;
    
    const [cases, setCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [clients, setClients] = useState([]); 
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
                ];

                if (!isIndicator) {
                    requests.unshift(apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }));
                }

                const responses = await Promise.all(requests);
                const usersResponse = isIndicator ? null : responses[0];
                const clientsResponse = isIndicator ? responses[0] : responses[1];

                setLawyers(usersResponse?.data?.data || []);
                setClients(clientsResponse.data || []);
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
        setSelectedCaseIds([]); 
        setBatchActionType(null);
        
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

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCaseIds(cases.map(c => c.id));
        } else {
            setSelectedCaseIds([]);
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
        if (!value && action !== 'delete') return; 
        if (!window.confirm(`Aplicar alteração em ${selectedCaseIds.length} processos?`)) return;

        setIsBatchProcessing(true);
        try {
            await apiClient.post('/cases/batch-update', {
                case_ids: selectedCaseIds,
                action: action,
                value: value
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('Ação em lote concluída!');
            fetchCases(); 
        } catch (err) {
            console.error(err);
            alert('Erro ao processar lote.');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleDeleteCase = async (caseId) => {
        if (window.confirm('Tem certeza que deseja excluir?')) {
            try {
                await apiClient.delete(`/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
                setCases(prev => prev.filter(c => c.id !== caseId));
            } catch (err) { alert('Erro ao excluir.'); }
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

    const isAllSelected = cases.length > 0 && Array.isArray(selectedCaseIds) && selectedCaseIds.length === cases.length;
    const selectedLawyer = lawyers.find(lawyer => String(lawyer.id) === String(filters.lawyer_id));
    const activeFilterChips = [];

    if (filters.search.trim()) {
        activeFilterChips.push({ key: 'search', label: `Busca: ${filters.search.trim()}` });
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

    if (!isIndicator && filters.lawyer_id) {
        activeFilterChips.push({
            key: 'lawyer_id',
            label: `Responsável: ${selectedLawyer?.name || 'Selecionado'}`,
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

        if (searchFeedback?.type === 'case_number_unavailable_for_indicator') {
            return {
                title: `O processo ${searchFeedback.search} foi localizado, mas não está disponível para indicação.`,
                description: 'O perfil Indicador visualiza apenas casos da fila de Analise Inicial que atendem aos filtros atuais.',
            };
        }

        if (searchFeedback?.type === 'case_number_filtered_out') {
            return {
                title: `O processo ${searchFeedback.search} foi localizado, mas não aparece na lista atual.`,
                description: 'Revise os filtros aplicados para verificar se eles estão restringindo a visualização do processo.',
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
                description: 'Quando houver processos em Analise Inicial aptos para a sua fila, eles aparecerão aqui.',
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
                <div style={{
                    marginBottom: '18px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1e3a8a',
                    fontWeight: 600,
                }}>
                    Esta fila mostra os casos em Analise Inicial disponiveis para indicacao de acordo.
                </div>
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
                            <p>Refine a carteira e a tabela atualiza automaticamente enquanto você trabalha.</p>
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
                            placeholder="Processo, cliente ou palavra-chave"
                            className={styles.filterControl}
                            name="search"
                            value={filters.search}
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

                    {!isIndicator && (
                        <label className={styles.filterField}>
                            <span className={styles.filterLabel}>
                                <FaUserTag />
                                Responsável do caso
                            </span>
                            <select className={styles.filterControl} name="lawyer_id" value={filters.lawyer_id} onChange={handleFilterChange}>
                                <option value="">Todos os responsáveis</option>
                                {lawyers.map((lawyer) => (
                                    <option key={lawyer.id} value={lawyer.id}>
                                        {lawyer.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>

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
                                            
                                            <th>Responsavel / Indicador</th>
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
                                                                style={{
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    background: '#1d4ed8',
                                                                    color: '#fff',
                                                                    padding: '8px 12px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Indicar Caso para acordo
                                                            </button>
                                                        )}
                                                        
                                                        {/* SÓ MOSTRA SE FOR ADMIN */}
                                                        {user?.role === 'admin' && !isIndicator && (
                                                            <span className={styles.actionIcon} onClick={() => handleDeleteCase(legalCase.id)}>
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
                                {user?.role === 'admin' && (
                                    <button className={`${styles.batchBtn} ${styles.btnDanger}`} onClick={() => executeBatchUpdate('delete')}>
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
                                        {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                )}

                                <button className={styles.batchCancelBtn} onClick={() => setBatchActionType(null)}>Cancelar</button>
                            </div>
                        )}

                        <button className={styles.batchClose} onClick={() => setSelectedCaseIds([])}><FaTimes /></button>
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
