// src/pages/CaseManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaFileExport, FaPlus, FaSearch, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import EditCaseModal from '../components/EditCaseModal';
import styles from '../styles/CaseManagement.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

// --- COMPONENTES AUXILIARES ---

// Mapa de Status
const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' },
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
};
// Mapa de Prioridade
const PRIORITY_DETAILS = {
    'alta': { name: 'Alta', color: '#e53e3e', textColor: '#FFFFFF' },
    'media': { name: 'Média', color: '#dd6b20', textColor: '#FFFFFF' },
    'baixa': { name: 'Baixa', color: '#38a169', textColor: '#FFFFFF' },
};

const StatusTag = ({ status }) => {
    const currentStatus = STATUS_DETAILS[status] || { 
        name: status.replace('_', ' '), 
        color: '#A0AEC0',
        textColor: '#1A202C'
    };
    return (
        <span 
            className={styles.statusTag} 
            style={{ 
                backgroundColor: currentStatus.color, 
                color: currentStatus.textColor 
            }}
        >
            {currentStatus.name}
        </span>
    );
};

const PriorityTag = ({ priority }) => {
    const currentPriority = PRIORITY_DETAILS[priority] || { 
        name: priority, 
        color: '#A0AEC0',
        textColor: '#1A202C'
    };
    return (
        <span 
            className={styles.priorityTag} 
            style={{ 
                backgroundColor: currentPriority.color, 
                color: currentPriority.textColor 
            }}
        >
            {currentPriority.name}
        </span>
    );
};


const CaseManagementPage = () => {
    const { token } = useAuth();
    const [cases, setCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [editingCase, setEditingCase] = useState(null); 
    // Removido estado isNewCaseModalOpen

    const [filters, setFilters] = useState({
        search: '', status: '', priority: '', lawyer_id: '',
    });

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
                console.error("Erro ao buscar dados de apoio (usuários/clientes)", err); 
            }
        };
        fetchDropdownData();
    }, [token]);

    const fetchCases = useCallback(async () => {
        if (!token) return;
        setLoading(true);
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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenEditModal = (legalCase) => setEditingCase(legalCase);
    const handleCloseEditModal = () => setEditingCase(null);
    const handleDataUpdate = () => fetchCases();

    const handleDeleteCase = async (caseId) => {
        if (window.confirm('Tem certeza que deseja excluir este caso? Esta ação não pode ser desfeita.')) {
            try {
                await apiClient.delete(`/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
                setCases(prevCases => prevCases.filter(c => c.id !== caseId));
                alert('Caso excluído com sucesso!');
            } catch (err) {
                alert('Não foi possível excluir o caso.');
            }
        }
    };
    
    const handleExport = async () => {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
            const response = await apiClient.get(`/cases/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `casos_concilia_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar os dados:', error);
            alert('Não foi possível exportar os dados.');
        }
    };

    const kpis = {
        total_cases: cases.length,
        total_cause_value: cases.reduce((acc, c) => {
            const value = parseFloat(c.cause_value);
            return acc + (isNaN(value) ? 0 : value);
        }, 0),
        total_agreement_value: cases.reduce((acc, c) => {
            const value = parseFloat(c.agreement_value);
            return acc + (isNaN(value) ? 0 : value);
        }, 0),
        total_economy: cases.reduce((acc, c) => {
            const original = parseFloat(c.original_value);
            const agreement = parseFloat(c.agreement_value);
            if (!isNaN(original) && !isNaN(agreement) && original > 0 && agreement > 0) {
                return acc + (original - agreement);
            }
            return acc;
        }, 0)
    };

    const formatValue = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1>Gestão de Casos</h1>
                    <p>Gerencie todos os casos direcionados para o escritório</p>
                </div>
                <div className={styles.headerActions}>
                    {/* Botão alterado para Link para a nova página de criação */}
                    <Link to="/cases/create" className={styles.newCaseButton}>
                        <FaPlus /> Novo Caso
                    </Link>
                </div>
            </header>
            
            <section className={styles.kpiGrid}>
                <KpiCard title="Total de Casos" value={kpis.total_cases.toString()} />
                <KpiCard title="Valor Total dos Casos" value={formatValue(kpis.total_cause_value)} />
                <KpiCard title="Total em Acordos" value={formatValue(kpis.total_agreement_value)} />
                <KpiCard title="Economia Gerada" value={formatValue(kpis.total_economy)} />
            </section>

            <section className={styles.filtersContainer}>
                <h3><FaSearch /> Filtros e Busca</h3>
                <div className={styles.filterControls}>
                    <input type="text" placeholder="Buscar por Nº do processo ou Autor..." className={styles.searchInput} name="search" value={filters.search} onChange={handleFilterChange} />
                    <select className={styles.filterSelect} name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">Todos os Status</option>
                        <option value="initial_analysis">Análise Inicial</option>
                        <option value="proposal_sent">Proposta Enviada</option>
                        <option value="in_negotiation">Em Negociação</option>
                        <option value="awaiting_draft">Aguardando Minuta</option>
                        <option value="closed_deal">Acordo Fechado</option>
                        <option value="failed_deal">Acordo Frustrado</option> 
                    </select>
                    <select className={styles.filterSelect} name="priority" value={filters.priority} onChange={handleFilterChange}>
                        <option value="">Todas as Prioridades</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                    <select className={styles.filterSelect} name="lawyer_id" value={filters.lawyer_id} onChange={handleFilterChange}>
                        <option value="">Todos os Advogados</option>
                        {lawyers.map(lawyer => (
                            <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>
                        ))}
                    </select>
                </div>
            </section>
            
            <section className={styles.tableContainer}>
                <h3>Lista de Casos ({cases.length})</h3>
                {loading ? <p>Carregando casos...</p> : error ? <p style={{color: 'red'}}>{error}</p> : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Banco/Cliente</th>
                                <th>Autor</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Advogado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map(legalCase => (
                                <tr key={legalCase.id}>
                                    <td>
                                        <Link to={`/cases/${legalCase.id}`} className={styles.caseLink}>{legalCase.id}</Link>
                                        <div className={styles.subText}>{legalCase.case_number}</div>
                                    </td>
                                    <td>
                                        <div>{legalCase.client?.name || 'N/A'}</div>
                                        <div className={styles.subText}>{legalCase.comarca || 'N/A'}</div>
                                    </td>
                                    <td>{legalCase.opposing_party}</td>
                                    <td>
                                        <div>{formatValue(legalCase.cause_value)}</div>
                                        <div className={styles.subText}>Negoc: {formatValue(legalCase.agreement_value)}</div>
                                    </td>
                                    <td><StatusTag status={legalCase.status} /></td>
                                    <td><PriorityTag priority={legalCase.priority} /></td>
                                    <td>
                                        <div>{legalCase.lawyer?.name || 'N/A'}</div>
                                    </td>
                                    
                                    {/* --- COLUNA DE AÇÕES CORRIGIDA --- */}
                                    <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Link 
                                                to={`/cases/${legalCase.id}`} 
                                                className={styles.actionIcon} 
                                                title="Ver Detalhes"
                                            >
                                                <FaEye />
                                            </Link>
                                            <span 
                                                className={styles.actionIcon} 
                                                onClick={() => handleOpenEditModal(legalCase)} 
                                                title="Editar"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <FaEdit />
                                            </span>
                                            <span 
                                                className={styles.actionIcon} 
                                                onClick={() => handleDeleteCase(legalCase.id)} 
                                                title="Excluir"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <FaTrash />
                                            </span>
                                        </div>
                                    </td>
                                    {/* --- FIM DA CORREÇÃO --- */}

                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
            
            {editingCase && (
                <EditCaseModal 
                    legalCase={editingCase}
                    onClose={handleCloseEditModal}
                    onCaseUpdated={handleDataUpdate}
                    clients={clients}
                    lawyers={lawyers}
                />
            )}
        </div>
    );
};

export default CaseManagementPage;