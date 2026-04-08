// src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import CasesTable from '../components/CasesTable';
import KpiCard from '../components/KpiCard';
import StatusDistributionChart from '../components/StatusDistributionChartJS';
import ProcessStageChart from '../components/ProcessStageChart';
import MonthlyEvolutionChart from '../components/MonthlyEvolutionChart';
import AgreementVolumeChart from '../components/AgreementVolumeChart';
import AgreementMacroPieChart from '../components/AgreementMacroPieChart';
import BrazilAgreementMap from '../components/BrazilAgreementMap';
import TeamPerformancePanel from '../components/TeamPerformancePanel';
import TeamPerformanceModal from '../components/TeamPerformanceModal';
import LawyerDetailModal from '../components/LawyerDetailModal';
import CasesListModal from '../components/CasesListModal';
import TopIndicatorsPanel from '../components/TopIndicatorsPanel';
import {
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
    const [recentCasesMeta, setRecentCasesMeta] = useState({
        currentPage: 1,
        lastPage: 1,
        perPage: 20,
        total: 0,
        from: 0,
        to: 0,
    });
    const [recentCasesPage, setRecentCasesPage] = useState(1);
    const [recentCasesPerPage, setRecentCasesPerPage] = useState(20);
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
                apiClient.get('/users/operators', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setClients(clientsResponse.data);
            setLawyers(Array.isArray(lawyersResponse.data) ? lawyersResponse.data : []);
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
        recentCasesPage: filterRecentCasesPage = 1,
        recentCasesPerPage: filterRecentCasesPerPage = 20,
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
            params.append('recent_cases_page', String(filterRecentCasesPage));
            params.append('recent_cases_per_page', String(filterRecentCasesPerPage));

            const response = await apiClient.get(`/dashboard?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDashboardData(response.data);
            const recentCasesResponse = response.data.recent_cases;

            if (Array.isArray(recentCasesResponse)) {
                setCases(recentCasesResponse);
                setRecentCasesMeta({
                    currentPage: 1,
                    lastPage: 1,
                    perPage: recentCasesResponse.length || filterRecentCasesPerPage,
                    total: recentCasesResponse.length,
                    from: recentCasesResponse.length > 0 ? 1 : 0,
                    to: recentCasesResponse.length,
                });
            } else {
                const recentCaseItems = Array.isArray(recentCasesResponse?.data) ? recentCasesResponse.data : [];
                setCases(recentCaseItems);
                setRecentCasesMeta({
                    currentPage: Number(recentCasesResponse?.current_page || filterRecentCasesPage || 1),
                    lastPage: Number(recentCasesResponse?.last_page || 1),
                    perPage: Number(recentCasesResponse?.per_page || filterRecentCasesPerPage || 20),
                    total: Number(recentCasesResponse?.total || recentCaseItems.length),
                    from: Number(recentCasesResponse?.from || (recentCaseItems.length > 0 ? 1 : 0)),
                    to: Number(recentCasesResponse?.to || recentCaseItems.length),
                });
            }
        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            setError('Não foi possível carregar os dados.');
        } finally {
            setLoading(false);
        }
    }, [token, isManager]);

    const handleApplyFilters = useCallback(() => {
        setRecentCasesPage(1);
        fetchDashboardData({
            startDate,
            endDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage,
        });
    }, [fetchDashboardData, startDate, endDate, selectedClient, selectedLawyer, selectedStatus, recentCasesPerPage]);

    const handleResetFilters = useCallback(() => {
        setStartDate('');
        setEndDate('');
        setSelectedClient('');
        setSelectedLawyer('');
        setSelectedStatus('');
        setRecentCasesPage(1);
        fetchDashboardData({
            recentCasesPage: 1,
            recentCasesPerPage,
        });
    }, [fetchDashboardData, recentCasesPerPage]);

    const handleRecentCasesPageSizeChange = useCallback((nextPerPage) => {
        if (nextPerPage === recentCasesPerPage) {
            return;
        }

        setRecentCasesPerPage(nextPerPage);
        setRecentCasesPage(1);
        fetchDashboardData({
            startDate,
            endDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage: nextPerPage,
        });
    }, [fetchDashboardData, recentCasesPerPage, startDate, endDate, selectedClient, selectedLawyer, selectedStatus]);

    const handleRecentCasesPageChange = useCallback((nextPage) => {
        if (nextPage < 1 || nextPage > recentCasesMeta.lastPage || nextPage === recentCasesPage) {
            return;
        }

        setRecentCasesPage(nextPage);
        fetchDashboardData({
            startDate,
            endDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
            recentCasesPage: nextPage,
            recentCasesPerPage,
        });
    }, [
        fetchDashboardData,
        recentCasesMeta.lastPage,
        recentCasesPage,
        recentCasesPerPage,
        startDate,
        endDate,
        selectedClient,
        selectedLawyer,
        selectedStatus,
    ]);

    useEffect(() => {
        if (token) {
            if (isManager) {
                Promise.all([
                    loadFilterOptions(),
                    fetchDashboardData({
                        recentCasesPage,
                        recentCasesPerPage,
                    }),
                ]);
                return;
            }

            fetchDashboardData({
                recentCasesPage,
                recentCasesPerPage,
            });
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
                return `${Math.round(Number.parseFloat(value || 0) || 0)}%`;
            default:
                return value;
        }
    };

    const indicationMetrics = dashboardData?.indication_metrics || {};
    const indicationsReceived = Number(indicationMetrics.indications_received || 0);
    const agreementsViaIndication = Number(indicationMetrics.agreements_via_indication || 0);
    const roundedIndicationRate = Math.round(Number.parseFloat(indicationMetrics.indication_flow_conversion_rate || 0) || 0);
    const agreementsByState = Array.isArray(dashboardData?.agreements_by_state) ? dashboardData.agreements_by_state : [];
    const agreementMacroDistribution = Array.isArray(dashboardData?.agreement_macro_distribution)
        ? dashboardData.agreement_macro_distribution
        : [];
    const indicatorLeaderboard = Array.isArray(dashboardData?.indicator_leaderboard)
        ? dashboardData.indicator_leaderboard
        : [];
    const indicatorDealsForChart = indicatorLeaderboard.filter((indicator) => Number(indicator.closed_deals || 0) > 0).slice(0, 8);
    const closedDealsByIndicatorChart = {
        labels: indicatorDealsForChart.map((indicator) => indicator.name),
        values: indicatorDealsForChart.map((indicator) => Number(indicator.closed_deals || 0)),
    };
    const recentCasesCurrentPage = Math.min(recentCasesMeta.currentPage || 1, recentCasesMeta.lastPage || 1);
    const recentCasesHasPagination = Number(recentCasesMeta.total || 0) > Number(recentCasesMeta.perPage || 20);

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
        indication_flow_conversion_rate: "Taxa de Indicação"
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

                    <section className={`${styles.kpiSection} ${styles.indicationSection}`}>
                        <div className={styles.kpiSectionHeader}>
                            <div className={styles.indicationHeaderContent}>
                                <span className={styles.indicationBadge}>Fluxo dedicado</span>
                                <h3 className={styles.kpiSectionTitle}>Fluxo de Indicação</h3>
                                <p className={styles.kpiSectionSubtitle}>Acompanhamento separado dos casos que vieram de indicação.</p>
                            </div>

                            <div className={styles.indicationHighlights}>
                                <span className={styles.indicationHighlight}>
                                    {indicationsReceived} recebidas
                                </span>
                                <span className={styles.indicationHighlight}>
                                    {agreementsViaIndication} convertidas
                                </span>
                                <span className={styles.indicationHighlight}>
                                    {roundedIndicationRate}% de taxa
                                </span>
                            </div>
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

                    <section className={styles.analyticsSection}>
                        <div className={styles.analyticsSectionHeader}>
                            <div>
                                <h3 className={styles.analyticsSectionTitle}>Inteligência de Acordos</h3>
                                <p className={styles.analyticsSectionSubtitle}>
                                    Leitura territorial dos acordos fechados e conversão por indicação no mesmo painel.
                                </p>
                            </div>
                        </div>

                        <div className={styles.analyticsGrid}>
                            <article className={`${styles.analyticsCard} ${styles.mapCard}`}>
                                <div className={styles.analyticsCardHeader}>
                                    <h4 className={styles.analyticsCardTitle}>Mapa do Brasil por Estado</h4>
                                    <p className={styles.analyticsCardSubtitle}>
                                        Estados ficam brancos sem acordos e avançam para verde escuro conforme o volume de acordos fechados cresce.
                                    </p>
                                </div>
                                <BrazilAgreementMap data={agreementsByState} />
                            </article>

                            <div className={styles.analyticsSidebar}>
                                <article className={`${styles.analyticsCard} ${styles.compactAnalyticsCard}`}>
                                    <div className={styles.analyticsCardHeader}>
                                        <h4 className={styles.analyticsCardTitle}>Acordos Fechados por Indicador</h4>
                                        <p className={styles.analyticsCardSubtitle}>
                                            Ranking em barras dos indicadores com maior volume de acordos convertidos no fluxo de indicação.
                                        </p>
                                    </div>
                                    <AgreementVolumeChart
                                        data={closedDealsByIndicatorChart}
                                        datasetLabel="Acordos fechados por indicador"
                                        color="#16a34a"
                                        emptyMessage="Não há acordos fechados por indicação com os filtros atuais."
                                        tooltipLabelFormatter={(context) => `${context.raw || 0} acordo(s) fechado(s)`}
                                    />
                                </article>

                                <article className={`${styles.analyticsCard} ${styles.compactAnalyticsCard} ${styles.fillAnalyticsCard}`}>
                                    <div className={styles.analyticsCardHeader}>
                                        <h4 className={styles.analyticsCardTitle}>Quem Mais Indicou e Converteu</h4>
                                        <p className={styles.analyticsCardSubtitle}>
                                            Exibição dos 3 principais indicadores, com opção de inverter a leitura para quem menos converteu.
                                        </p>
                                    </div>
                                    <TopIndicatorsPanel data={indicatorLeaderboard} />
                                </article>
                            </div>
                        </div>
                    </section>

                    <section className={styles.macroSection}>
                        <article className={`${styles.analyticsCard} ${styles.macroStandaloneCard}`}>
                            <div className={styles.analyticsCardHeader}>
                                <h4 className={styles.analyticsCardTitle}>Visão Macro de Acordos</h4>
                                <p className={styles.analyticsCardSubtitle}>
                                    Distribuição exclusiva entre alta economia, Livelo, Ourocap e carteira geral.
                                </p>
                            </div>
                            <AgreementMacroPieChart data={agreementMacroDistribution} />
                        </article>
                    </section>

                    {isManager && (
                        <section className={styles.teamPerformanceSection}>
                            <div className={styles.teamPerformanceSectionHeader}>
                                <h3>Performance da Equipe</h3>
                                <p>
                                    Destaque dos advogados com melhor score no período filtrado, mantendo o acesso ao ranking completo.
                                </p>
                            </div>

                            <div className={styles.teamPerformancePanelWrap}>
                                <TeamPerformancePanel
                                    data={dashboardData?.team_performance || []}
                                    onOpenModal={() => setIsPerformanceModalOpen(true)}
                                    onViewDetails={handleOpenDetailModal}
                                />
                            </div>
                        </section>
                    )}

                    <div className={styles.recentCases}>
                        <div className={styles.recentCasesHeader}>
                            <div className={styles.recentCasesTitleGroup}>
                                <h3 className={styles.recentCasesTitle}>
                                    <FaBriefcase color="#A0AEC0" size={18} /> Casos Recentes na Alçada
                                </h3>
                                <p className={styles.recentCasesSubtitle}>
                                    A lista considera os casos que entraram na alçada ou tiveram o valor da alçada atualizado mais recentemente.
                                </p>
                            </div>

                            <div className={styles.recentCasesHeaderActions}>
                                <div className={styles.recentCasesPageSize}>
                                    <button
                                        type="button"
                                        className={`${styles.recentCasesPageSizeButton} ${recentCasesPerPage === 20 ? styles.recentCasesPageSizeButtonActive : ''}`}
                                        onClick={() => handleRecentCasesPageSizeChange(20)}
                                    >
                                        20
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.recentCasesPageSizeButton} ${recentCasesPerPage === 50 ? styles.recentCasesPageSizeButtonActive : ''}`}
                                        onClick={() => handleRecentCasesPageSizeChange(50)}
                                    >
                                        50
                                    </button>
                                </div>

                                <Link to="/cases" className={styles.viewAllLink}>
                                    <button type="button" className={styles.viewAllBtn}>
                                        Ver Todos <FaArrowRight size={12} />
                                    </button>
                                </Link>
                            </div>
                        </div>

                        <CasesTable cases={cases} />

                        <div className={styles.recentCasesFooter}>
                            <span className={styles.recentCasesMeta}>
                                Mostrando {recentCasesMeta.from || 0}-{recentCasesMeta.to || 0} de {recentCasesMeta.total || 0} casos recentes
                            </span>

                            <div className={styles.recentCasesPagination}>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(1)}
                                    disabled={!recentCasesHasPagination || recentCasesCurrentPage <= 1}
                                >
                                    {'<<'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesCurrentPage - 1)}
                                    disabled={!recentCasesHasPagination || recentCasesCurrentPage <= 1}
                                >
                                    {'<'}
                                </button>
                                <span className={styles.recentCasesCurrentPage}>{recentCasesCurrentPage}</span>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesCurrentPage + 1)}
                                    disabled={!recentCasesHasPagination || recentCasesCurrentPage >= recentCasesMeta.lastPage}
                                >
                                    {'>'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesMeta.lastPage)}
                                    disabled={!recentCasesHasPagination || recentCasesCurrentPage >= recentCasesMeta.lastPage}
                                >
                                    {'>>'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
