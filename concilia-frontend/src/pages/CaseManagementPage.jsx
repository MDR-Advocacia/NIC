// src/pages/CaseManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaPlus, FaSearch, FaEye, FaEdit, FaTrash, 
    FaCheckSquare, FaExchangeAlt, FaTrashAlt, FaTimes, 
    FaGavel, FaExclamationCircle, FaUserTag 
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import EditCaseModal from '../components/EditCaseModal';
import styles from '../styles/CaseManagement.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

// --- COMPONENTES AUXILIARES ---

const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' },
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
};

const PRIORITY_DETAILS = {
    'alta': { name: 'Alta', color: '#e53e3e', textColor: '#FFFFFF' },
    'media': { name: 'Média', color: '#dd6b20', textColor: '#FFFFFF' },
    'baixa': { name: 'Baixa', color: '#38a169', textColor: '#FFFFFF' },
};

const StatusTag = ({ status }) => {
    const currentStatus = STATUS_DETAILS[status] || { name: status, color: '#A0AEC0', textColor: '#1A202C' };
    return <span className={styles.statusTag} style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}>{currentStatus.name}</span>;
};

const PriorityTag = ({ priority }) => {
    const currentPriority = PRIORITY_DETAILS[priority] || { name: priority, color: '#A0AEC0', textColor: '#1A202C' };
    return <span className={styles.priorityTag} style={{ backgroundColor: currentPriority.color, color: currentPriority.textColor }}>{currentPriority.name}</span>;
};

const CaseManagementPage = () => {
    const { token } = useAuth();
    const [cases, setCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [clients, setClients] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingCase, setEditingCase] = useState(null);

    // --- ESTADOS DE AÇÃO EM LOTE (Inicializados corretamente) ---
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
                const [usersResponse, clientsResponse] = await Promise.all([
                    apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setLawyers(usersResponse.data.data || []);
                setClients(clientsResponse.data || []);
            } catch (err) { 
                console.error("Erro ao buscar dados de apoio", err); 
            }
        };
        fetchDropdownData();
    }, [token]);

    // Carrega Casos
    const fetchCases = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setSelectedCaseIds([]); // Limpa seleção
        setBatchActionType(null);
        
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
            const response = await apiClient.get(`/cases?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            setCases(response.data);
        } catch (err) {
            setError('Não foi possível carregar os casos.');
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchCases(); }, 500);
        return () => clearTimeout(timer);
    }, [fetchCases]);

    // --- MANIPULADORES ---
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

    // --- CORREÇÃO DE SEGURANÇA PARA O ERRO DO CHECKBOX ---
    const handleSelectCase = (id) => {
        if (!id) return;
        setSelectedCaseIds(prev => {
            // Garante que prev é um array antes de usar includes
            const list = Array.isArray(prev) ? prev : [];
            
            if (list.includes(id)) {
                return list.filter(cId => cId !== id);
            }
            return [...list, id];
        });
    };
    // -----------------------------------------------------

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

    const formatValue = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    
    const kpis = {
        total_cases: cases.length,
        total_cause_value: cases.reduce((acc, c) => acc + (parseFloat(c.cause_value) || 0), 0),
        total_agreement_value: cases.reduce((acc, c) => acc + (parseFloat(c.agreement_value) || 0), 0),
        total_economy: cases.reduce((acc, c) => {
            const orig = parseFloat(c.original_value);
            const agree = parseFloat(c.agreement_value);
            return (orig > 0 && agree > 0) ? acc + (orig - agree) : acc;
        }, 0)
    };

    // Verifica se todos estão selecionados com segurança
    const isAllSelected = cases.length > 0 && Array.isArray(selectedCaseIds) && selectedCaseIds.length === cases.length;

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div><h1>Gestão de Casos</h1><p>Gerencie todos os casos direcionados para o escritório</p></div>
                <div className={styles.headerActions}>
                    <Link to="/cases/create" className={styles.newCaseButton}><FaPlus /> Novo Caso</Link>
                </div>
            </header>
            
            <section className={styles.kpiGrid}>
                <KpiCard title="Total na Tela" value={kpis.total_cases.toString()} />
                <KpiCard title="Selecionados" value={selectedCaseIds?.length?.toString() || '0'} />
                <KpiCard title="Acordos (R$)" value={formatValue(kpis.total_agreement_value)} />
                <KpiCard title="Economia (R$)" value={formatValue(kpis.total_economy)} />
            </section>

            <section className={styles.filtersContainer}>
                <h3><FaSearch /> Filtros</h3>
                <div className={styles.filterControls}>
                    <input type="text" placeholder="Buscar..." className={styles.searchInput} name="search" value={filters.search} onChange={handleFilterChange} />
                    <select className={styles.filterSelect} name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">Status: Todos</option>
                        {Object.entries(STATUS_DETAILS).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
                    </select>
                    <select className={styles.filterSelect} name="lawyer_id" value={filters.lawyer_id} onChange={handleFilterChange}>
                        <option value="">Advogado: Todos</option>
                        {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </section>
            
            <section className={styles.tableContainer}>
                {loading ? <p>Carregando...</p> : error ? <p style={{color:'red'}}>{error}</p> : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{width: '40px', textAlign: 'center'}}>
                                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className={styles.checkboxInput} />
                                </th>
                                <th>ID/Processo</th>
                                <th>Cliente/Local</th>
                                <th>Partes</th>
                                <th>Valores</th>
                                <th>Status/Prioridade</th>
                                <th>Responsável</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map(legalCase => (
                                <tr key={legalCase.id} className={Array.isArray(selectedCaseIds) && selectedCaseIds.includes(legalCase.id) ? styles.rowSelected : ''}>
                                    <td style={{textAlign: 'center'}}>
                                        <input 
                                            type="checkbox" 
                                            checked={Array.isArray(selectedCaseIds) && selectedCaseIds.includes(legalCase.id)} 
                                            onChange={() => handleSelectCase(legalCase.id)}
                                            className={styles.checkboxInput}
                                        />
                                    </td>
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
                                    <td>{legalCase.lawyer?.name || <span style={{color: '#E53E3E'}}>Sem advogado</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Link to={`/cases/${legalCase.id}`} className={styles.actionIcon}><FaEye /></Link>
                                            <span className={styles.actionIcon} onClick={() => setEditingCase(legalCase)}><FaEdit /></span>
                                            <span className={styles.actionIcon} onClick={() => handleDeleteCase(legalCase.id)}><FaTrash /></span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* --- BARRA FLUTUANTE DE AÇÕES EM LOTE --- */}
            {Array.isArray(selectedCaseIds) && selectedCaseIds.length > 0 && (
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
                                <button className={`${styles.batchBtn} ${styles.btnDanger}`} onClick={() => executeBatchUpdate('delete')}>
                                    <FaTrashAlt /> Excluir
                                </button>
                            </>
                        ) : (
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <span style={{fontSize:'0.9rem'}}>Selecione:</span>
                                
                                {batchActionType === 'status' && (
                                    <select className={styles.batchSelect} onChange={(e) => executeBatchUpdate('update_status', e.target.value)} defaultValue="">
                                        <option value="" disabled>Novo Status...</option>
                                        {Object.entries(STATUS_DETAILS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
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