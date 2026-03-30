// src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import CasesTable from '../components/CasesTable';
import KpiCard from '../components/KpiCard';
import StatusDistributionChart from '../components/StatusDistributionChartJS';
import ProcessStageChart from '../components/ProcessStageChart';
import MonthlyEvolutionChart from '../components/MonthlyEvolutionChart';
import TeamPerformancePanel from '../components/TeamPerformancePanel';
import TeamPerformanceModal from '../components/TeamPerformanceModal';
import LawyerDetailModal from '../components/LawyerDetailModal';
import CasesListModal from '../components/CasesListModal';
import {
    FaTrophy,
    FaArrowRight,
    FaBriefcase,
    FaSlidersH,
    FaCalendarAlt,
    FaBuilding,
    FaUserTie,
    FaFlag,
    FaSearch,
    FaEraser,
} from 'react-icons/fa'; 
import styles from '../styles/Dashboard.module.css';
import { Link } from 'react-router-dom';
import { LEGAL_CASE_STATUS_OPTIONS } from '../constants/legalCaseStatus';

const GENERAL_KPI_ORDER = [
    'total_cases',
    'active_cases',
    'closed_deals_today',
    'total_original_value',
    'total_agreement_value',
    'average_ticket',
    'total_economy',
    'livelo_closed_deals',
    'ourocap_closed_deals',
    'conversion_rate',
];

const INDICATION_KPI_ORDER = [
    'indications_received',
    'agreements_via_indication',
    'indication_flow_conversion_rate',
];

const DashboardPage = () => {
    
    const { token, user } = useAuth();
    
    // LÓGICA DE PERMISSÃO
    const role = user?.role ? user.role.toLowerCase() : '';
    const isManager = role.includes('admin') || role.includes('supervisor') || role.includes('gerente');

    const [dashboardData, setDashboardData] = useState(null);
    const [cases, setCases] = useState([]);
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filtros
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedLawyer, setSelectedLawyer] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Modais
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLawyerForDetail, setSelectedLawyerForDetail] = useState(null);
    const [isCasesListModalOpen, setIsCasesListModalOpen] = useState(false);
    const [modalStatusKey, setModalStatusKey] = useState(null);
    const [modalStatusName, setModalStatusName] = useState('');

    const activeFilterCount = [startDate, endDate, selectedClient, selectedLawyer, selectedStatus]
        .filter(Boolean)
        .length;

    const formatFilterDate = (value) => {
        if (!value) {
            return '';
        }

        const parsedDate = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat('pt-BR').format(parsedDate);
    };

    const selectedClientName = clients.find((client) => String(client.id) === String(selectedClient))?.name;
    const selectedLawyerName = lawyers.find((lawyer) => String(lawyer.id) === String(selectedLawyer))?.name;
    const selectedStatusName = LEGAL_CASE_STATUS_OPTIONS.find((statusOption) => statusOption.value === selectedStatus)?.name;

    const activeFilterChips = [
        startDate ? `A partir de ${formatFilterDate(startDate)}` : null,
        endDate ? `Até ${formatFilterDate(endDate)}` : null,
        selectedClientName ? `Cliente: ${selectedClientName}` : null,
        selectedLawyerName ? `Responsável: ${selectedLawyerName}` : null,
        selectedStatusName ? `Status: ${selectedStatusName}` : null,
    ].filter(Boolean);

    const handleOpenDetailModal = (lawyer) => {
        setSelectedLawyerForDetail(lawyer);
        setIsDetailModalOpen(true);
    };

    const loadFilterOptions = useCallback(async () => {
        if (!token || !isManager) {
            setClients([]);
            setLawyers([]);
            return;
        }

        try {
            const [clientsResponse, lawyersResponse] = await Promise.all([
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setClients(clientsResponse.data);
            setLawyers(lawyersResponse.data.data || []);
        } catch (err) {
            console.error('Erro ao carregar opções de filtro:', err);
            setClients([]);
            setLawyers([]);
        }
    }, [token, isManager]);

    const fetchDashboardData = useCallback(async ({
        startDate: filterStartDate = '',
        endDate: filterEndDate = '',
        selectedClient: filterClient = '',
        selectedLawyer: filterLawyer = '',
        selectedStatus: filterStatus = '',
    } = {}) => {
        if (!token) return;

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filterStartDate) params.append('start_date', filterStartDate);
            if (filterEndDate) params.append('end_date', filterEndDate);
            
            if (isManager) {
                if (filterClient) params.append('client_id', filterClient);
                if (filterLawyer) params.append('lawyer_id', filterLawyer);
            }
            
            if (filterStatus) params.append('status', filterStatus);
            
            const response = await apiClient.get(`/dashboard?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setDashboardData(response.data);
            setCases(response.data.recent_cases || []);
        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            setError('Não foi possível carregar os dados.');
        } finally {
            setLoading(false);
        }
    }, [token, isManager]);

    const handleApplyFilters = useCallback(() => {
        fetchDashboardData({
            startDate,
            endDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
        });
    }, [fetchDashboardData, startDate, endDate, selectedClient, selectedLawyer, selectedStatus]);

    const handleResetFilters = useCallback(() => {
        setStartDate('');
        setEndDate('');
        setSelectedClient('');
        setSelectedLawyer('');
        setSelectedStatus('');
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        if (token) {
            if (isManager) {
                Promise.all([loadFilterOptions(), fetchDashboardData()]);
                return;
            }

            fetchDashboardData();
        }
    }, [token, isManager, loadFilterOptions, fetchDashboardData]);

    const handleChartClick = (statusKey, statusName) => {
        setModalStatusKey(statusKey);
        setModalStatusName(statusName);
        setIsCasesListModalOpen(true);
    };

    const formatKpiValue = (key, value) => {
        const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        switch (key) {
            case 'total_original_value':
            case 'total_agreement_value':
            case 'total_economy':
            case 'average_ticket':
                return formatCurrency(value);
            case 'conversion_rate':
            case 'indication_flow_conversion_rate':
                return `${parseFloat(value || 0).toFixed(2)}%`;
            default:
                return value;
        }
    };
    
    const kpiTitles = {
        total_original_value: "Total em alçadas",
        total_agreement_value: "Total em valores de acordos",
        total_economy: "Economia gerada",
        total_cases: "Casos Totais",
        active_cases: "Casos Ativos",
        closed_deals_today: "Acordos Fechados Hoje",
        average_ticket: "Ticket Médio",
        livelo_closed_deals: "Acordos Livelo",
        ourocap_closed_deals: "Acordos Ourocap",
        conversion_rate: "Taxa de Conversão",
        indications_received: "Indicações Recebidas",
        agreements_via_indication: "Acordos via Indicação",
        indication_flow_conversion_rate: "Taxa de Conversão do Fluxo"
    };

    const renderKpiGrid = (data, order) => {
        if (!data) {
            return <p>Não há dados de KPI para exibir.</p>;
        }

        const entries = order
            .filter((key) => Object.prototype.hasOwnProperty.call(data, key))
            .map((key) => [key, data[key]]);

        if (entries.length === 0) {
            return <p>Não há dados de KPI para exibir.</p>;
        }

        return (
            <div className={styles.kpiGrid}>
                {entries.map(([key, value]) => (
                    <KpiCard
                        key={key}
                        title={kpiTitles[key] || key}
                        value={formatKpiValue(key, value)}
                    />
                ))}
            </div>
        );
    };

    if (loading) return <p>Carregando dashboard...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.dashboardContainer}>
            
            {/* 1. FILTROS (Gestor) */}
            {isManager && (
                <section className={styles.filters}>
                    <div className={styles.filtersHeader}>
                        <div className={styles.filtersTitleGroup}>
                            <div className={styles.filtersIconBadge}>
                                <FaSlidersH />
                            </div>
                            <div>
                                <h2 className={styles.filtersTitle}>Filtros do Dashboard</h2>
                                <p className={styles.filtersSubtitle}>
                                    Ajuste a leitura dos indicadores por período, cliente, responsável e etapa do caso.
                                </p>
                            </div>
                        </div>

                        <div className={styles.filtersCounter}>
                            <strong>{activeFilterCount}</strong>
                            <span>{activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
                        </div>
                    </div>

                    <div className={styles.filtersGrid}>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                <FaCalendarAlt />
                                <span>Data inicial</span>
                            </label>
                            <input
                                className={styles.filterControl}
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                <FaCalendarAlt />
                                <span>Data final</span>
                            </label>
                            <input
                                className={styles.filterControl}
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                <FaBuilding />
                                <span>Cliente</span>
                            </label>
                            <select
                                className={styles.filterControl}
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                <FaUserTie />
                                <span>Responsável</span>
                            </label>
                            <select
                                className={styles.filterControl}
                                value={selectedLawyer}
                                onChange={(e) => setSelectedLawyer(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {lawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                <FaFlag />
                                <span>Status</span>
                            </label>
                            <select
                                className={styles.filterControl}
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => (
                                    <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.filtersFooter}>
                        <div className={styles.filtersSummary}>
                            {activeFilterChips.length > 0 ? (
                                activeFilterChips.map((chip) => (
                                    <span key={chip} className={styles.filterChip}>{chip}</span>
                                ))
                            ) : (
                                <span className={styles.filtersHint}>
                                    Sem filtros aplicados. Exibindo a visão geral do dashboard.
                                </span>
                            )}
                        </div>

                        <div className={styles.filterActions}>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className={styles.clearFilterButton}
                                disabled={activeFilterCount === 0}
                            >
                                <FaEraser />
                                Limpar
                            </button>
                            <button type="button" onClick={handleApplyFilters} className={styles.filterButton}>
                                <FaSearch />
                                Atualizar painel
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* 2. KPIs (Gestor) */}
            {isManager && (
                <div className={styles.kpiSections}>
                    <section className={styles.kpiSection}>
                        <div className={styles.kpiSectionHeader}>
                            <h3 className={styles.kpiSectionTitle}>Visão Geral de Acordos</h3>
                            <p className={styles.kpiSectionSubtitle}>Indicadores dos casos com alçada na gestão de casos.</p>
                        </div>
                        {renderKpiGrid(dashboardData?.kpis, GENERAL_KPI_ORDER)}
                    </section>

                    <section className={styles.kpiSection}>
                        <div className={styles.kpiSectionHeader}>
                            <h3 className={styles.kpiSectionTitle}>Fluxo de Indicação</h3>
                            <p className={styles.kpiSectionSubtitle}>Acompanhamento separado dos casos que vieram de indicação.</p>
                        </div>
                        {renderKpiGrid(dashboardData?.indication_metrics, INDICATION_KPI_ORDER)}
                    </section>
                </div>
            )}

            {/* LAYOUT FLUIDO */}
            <div 
                className={styles.dashboardGrid}
                style={!isManager ? { display: 'flex', justifyContent: 'center' } : {}}
            >
                <div 
                    className={styles.mainContent} 
                    style={{ 
                        width: isManager ? 'auto' : '100%',
                        maxWidth: isManager ? 'none' : '1200px'
                    }}
                >
                    <div className={styles.chartsGrid}>
                        <div className={styles.chartCard}>
                            <h3>Evolução Mensal (Últimos 12 Meses)</h3>
                            {dashboardData && dashboardData.monthly_evolution ? (
                                <MonthlyEvolutionChart data={dashboardData.monthly_evolution} />
                            ) : <p>Não há dados de evolução mensal para exibir.</p>}
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Distribuição de Status (Visão Geral)</h3>
                            {dashboardData && dashboardData.status_distribution ? (
                                <StatusDistributionChart 
                                    data={dashboardData.status_distribution} 
                                    onStageClick={handleChartClick}
                                />
                            ) : <p>Não há dados de distribuição para exibir.</p>}
                        </div>
                    </div>

                    <div className={styles.statusDistribution}>
                        <h3>Distribuição por Etapa do Processo</h3>
                        {dashboardData && dashboardData.status_distribution ? (
                            <ProcessStageChart 
                                data={dashboardData.status_distribution} 
                                onStageClick={handleChartClick}
                            />
                        ) : <p>Não há dados de distribuição para exibir.</p>}
                    </div>

                    {/* --- AQUI ESTÁ A MUDANÇA FORÇADA DO BOTÃO --- */}
                    <div className={styles.recentCases}>
                        {/* Header flexível */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '15px',
                            borderBottom: '1px solid #2d3748',
                            paddingBottom: '10px'
                        }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaBriefcase color="#A0AEC0" size={18} /> Casos Recentes
                            </h3>
                            
                            {/* ESTRATÉGIA NOVA: Botão dentro do Link */}
                            <Link to="/cases" style={{ textDecoration: 'none' }}>
                                <button 
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid transparent', // Borda transparente para manter tamanho
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#63b3ed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                    // Hover via JS direto no elemento button
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(99, 179, 237, 0.1)';
                                        e.currentTarget.style.color = '#ffffff';
                                        e.currentTarget.style.transform = 'translateX(2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#63b3ed';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    Ver Todos <FaArrowRight size={12} />
                                </button>
                            </Link>
                        </div>

                        <CasesTable cases={cases} />
                    </div>
                </div>

                {/* 3. PERFORMANCE DE EQUIPE (Gestor) */}
                {isManager && (
                    <div className={styles.rightSidebar}>
                        <div className={styles.chartCard}>
                            <h3><FaTrophy /> Performance da Equipe</h3>
                            <TeamPerformancePanel 
                                data={dashboardData?.team_performance || []}
                                onOpenModal={() => setIsPerformanceModalOpen(true)}
                                onViewDetails={handleOpenDetailModal}
                            />
                        </div>
                    </div>
                )}
            </div>

            <TeamPerformanceModal
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                onViewDetails={handleOpenDetailModal}
                data={dashboardData?.team_performance || []} 
            />
            <LawyerDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                lawyer={selectedLawyerForDetail}
            />
            <CasesListModal
                isOpen={isCasesListModalOpen}
                onClose={() => setIsCasesListModalOpen(false)}
                statusKey={modalStatusKey}
                statusName={modalStatusName}
            />
        </div>
    );
};

export default DashboardPage;
