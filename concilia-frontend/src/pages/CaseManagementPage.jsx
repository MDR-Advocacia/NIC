// src/pages/CaseManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaPlus, FaSearch, FaEye, FaEdit, FaTrash, 
    FaCheckSquare, FaExchangeAlt, FaTrashAlt, FaTimes, 
    FaGavel, FaExclamationCircle, FaUserTag,
    FaChevronLeft, FaChevronRight,
    FaSort, FaSortUp, FaSortDown
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

// --- COMPONENTES AUXILIARES ---

const PRIORITY_DETAILS = {
    'alta': { name: 'Alta', color: '#e53e3e', textColor: '#FFFFFF' },
    'media': { name: 'Média', color: '#dd6b20', textColor: '#FFFFFF' },
    'baixa': { name: 'Baixa', color: '#38a169', textColor: '#FFFFFF' },
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

    const [filters, setFilters] = useState({
        search: '', status: '', priority: '', lawyer_id: '',
    });

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
                setPaginationData({
                    last_page: response.data.last_page,
                    total: response.data.total,
                    from: response.data.from,
                    to: response.data.to
                });
            } else {
                setCases(response.data);
            }

        } catch (err) {
            setError('Não foi possível carregar os casos.');
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
                <h3><FaSearch /> Filtros</h3>
                <div className={styles.filterControls}>
                    <input type="text" placeholder="Buscar..." className={styles.searchInput} name="search" value={filters.search} onChange={handleFilterChange} />
                    <select className={styles.filterSelect} name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">Status: Todos</option>
                        {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>)}
                    </select>
                    {!isIndicator && (
                        <select className={styles.filterSelect} name="lawyer_id" value={filters.lawyer_id} onChange={handleFilterChange}>
                            <option value="">Advogado: Todos</option>
                            {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    )}
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
                                            {legalCase.agreement_value > 0 && <div style={{color: '#38a169', fontSize: '0.8rem'}}>Acordo: {formatValue(legalCase.agreement_value)}</div>}
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
