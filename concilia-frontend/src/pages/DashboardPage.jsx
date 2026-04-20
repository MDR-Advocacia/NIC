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
import { LEGAL_CASE_STATUS_OPTIONS, UNASSIGNED_RESPONSIBLE_VALUE } from '../constants/legalCaseStatus';

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

const METRIC_VIEW_OPTIONS = [
    { key: 'general', label: 'Visão geral' },
    { key: 'by_responsible', label: 'Por Responsável' },
    { key: 'by_indicator', label: 'Por Indicador' },
];

const METRIC_PERIOD_OPTIONS = [
    { key: 'day', label: 'Dia' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mês' },
];

const GENERAL_PERIOD_METRIC_CARDS = [
    {
        key: 'agreements_count',
        title: 'Acordos fechados',
        description: 'Fechamentos do período selecionado',
    },
    {
        key: 'converted_indications_count',
        title: 'Indicações convertidas',
        description: 'Casos indicados que chegaram a acordo',
    },
    {
        key: 'total_agreement_value',
        title: 'Total em valores de acordos',
        description: 'Somatório dos acordos fechados no período',
    },
    {
        key: 'average_ticket',
        title: 'Ticket médio',
        description: 'Média do valor dos acordos fechados',
    },
    {
        key: 'total_economy',
        title: 'Economia gerada',
        description: 'Diferença entre valor original e valor acordado',
    },
];

const DashboardPage = () => {
    const { token, user } = useAuth();

    // LÓGICA DE PERMISSÃO
    const role = user?.role ? user.role.toLowerCase() : '';
    const isManager = role.includes('admin') || role.includes('supervisor') || role.includes('gerente');
    const isOperator = role.includes('operador');
    const canUsePeriodFilters = isManager || isOperator;

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
    const [portfolioStartDate, setPortfolioStartDate] = useState('');
    const [portfolioEndDate, setPortfolioEndDate] = useState('');
    const [closingStartDate, setClosingStartDate] = useState('');
    const [closingEndDate, setClosingEndDate] = useState('');
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
    const [selectedMetricsView, setSelectedMetricsView] = useState('general');
    const [selectedMetricsPeriod, setSelectedMetricsPeriod] = useState('day');

    const activeFilterValues = [
        portfolioStartDate,
        portfolioEndDate,
        closingStartDate,
        closingEndDate,
        ...(isManager ? [selectedClient, selectedLawyer, selectedStatus] : []),
    ];

    const activeFilterCount = activeFilterValues
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

    const buildDateRangeChip = (label, startValue, endValue) => {
        if (!startValue && !endValue) {
            return null;
        }

        if (startValue && endValue) {
            return `${label}: ${formatFilterDate(startValue)} a ${formatFilterDate(endValue)}`;
        }

        if (startValue) {
            return `${label}: a partir de ${formatFilterDate(startValue)}`;
        }

        return `${label}: até ${formatFilterDate(endValue)}`;
    };

    const selectedClientName = clients.find((client) => String(client.id) === String(selectedClient))?.name;
    const selectedLawyerName = selectedLawyer === UNASSIGNED_RESPONSIBLE_VALUE
        ? 'Sem responsável'
        : lawyers.find((lawyer) => String(lawyer.id) === String(selectedLawyer))?.name;
    const selectedStatusName = LEGAL_CASE_STATUS_OPTIONS.find((statusOption) => statusOption.value === selectedStatus)?.name;
    const hasClosingDateFilter = Boolean(closingStartDate || closingEndDate);
    const metricsViewTitles = {
        general: 'Leitura rápida do período',
        by_responsible: 'Desempenho por responsável',
        by_indicator: 'Conversão por indicador',
    };
    const metricsViewSubtitles = {
        general: 'Acompanhe acordos fechados e indicações convertidas no recorte selecionado, respeitando os filtros ativos.',
        by_responsible: 'Compare o volume fechado por responsável no período atual sem perder os filtros já aplicados no dashboard.',
        by_indicator: 'Veja quais indicadores mais converteram acordos no período ativo, mantendo a leitura filtrada da operação.',
    };

    const activeFilterChips = [
        buildDateRangeChip('Carteira', portfolioStartDate, portfolioEndDate),
        buildDateRangeChip('Fechamento', closingStartDate, closingEndDate),
        ...(isManager
            ? [
                selectedClientName ? `Cliente: ${selectedClientName}` : null,
                selectedLawyerName ? `Responsável: ${selectedLawyerName}` : null,
                selectedStatusName ? `Status: ${selectedStatusName}` : null,
            ]
            : []),
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
        portfolioStartDate: filterPortfolioStartDate = '',
        portfolioEndDate: filterPortfolioEndDate = '',
        closingStartDate: filterClosingStartDate = '',
        closingEndDate: filterClosingEndDate = '',
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
            if (filterPortfolioStartDate) params.append('portfolio_start_date', filterPortfolioStartDate);
            if (filterPortfolioEndDate) params.append('portfolio_end_date', filterPortfolioEndDate);
            if (filterClosingStartDate) params.append('closing_start_date', filterClosingStartDate);
            if (filterClosingEndDate) params.append('closing_end_date', filterClosingEndDate);

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
            portfolioStartDate,
            portfolioEndDate,
            closingStartDate,
            closingEndDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage,
        });
    }, [
        fetchDashboardData,
        portfolioStartDate,
        portfolioEndDate,
        closingStartDate,
        closingEndDate,
        selectedClient,
        selectedLawyer,
        selectedStatus,
        recentCasesPerPage,
    ]);

    const handleResetFilters = useCallback(() => {
        setPortfolioStartDate('');
        setPortfolioEndDate('');
        setClosingStartDate('');
        setClosingEndDate('');
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
            portfolioStartDate,
            portfolioEndDate,
            closingStartDate,
            closingEndDate,
            selectedClient,
            selectedLawyer,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage: nextPerPage,
        });
    }, [
        fetchDashboardData,
        recentCasesPerPage,
        portfolioStartDate,
        portfolioEndDate,
        closingStartDate,
        closingEndDate,
        selectedClient,
        selectedLawyer,
        selectedStatus,
    ]);

    const handleRecentCasesPageChange = useCallback((nextPage) => {
        if (nextPage < 1 || nextPage > recentCasesMeta.lastPage || nextPage === recentCasesPage) {
            return;
        }

        setRecentCasesPage(nextPage);
        fetchDashboardData({
            portfolioStartDate,
            portfolioEndDate,
            closingStartDate,
            closingEndDate,
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
        portfolioStartDate,
        portfolioEndDate,
        closingStartDate,
        closingEndDate,
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
    const isInitialLoading = loading && !dashboardData;
    const isRefreshing = loading && !!dashboardData;
    const agreementsByState = Array.isArray(dashboardData?.agreements_by_state) ? dashboardData.agreements_by_state : [];
    const agreementMacroDistribution = Array.isArray(dashboardData?.agreement_macro_distribution)
        ? dashboardData.agreement_macro_distribution
        : [];
    const viewMetrics = dashboardData?.view_metrics || {};
    const selectedMetricViewData = viewMetrics?.[selectedMetricsView]?.[selectedMetricsPeriod] || null;
    const selectedMetricSummary = selectedMetricViewData?.summary || {};
    const selectedMetricItems = Array.isArray(selectedMetricViewData?.items) ? selectedMetricViewData.items : [];
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
        closed_deals_today: hasClosingDateFilter ? "Acordos Fechados no Período" : "Acordos Fechados Hoje",
        average_ticket: "Ticket Médio",
        livelo_closed_deals: "Acordos Livelo",
        ourocap_closed_deals: "Acordos Ourocap",
        conversion_rate: "Taxa de Conversão",
        indications_received: "Indicações Recebidas",
        agreements_via_indication: "Acordos via Indicação",
        indication_flow_conversion_rate: "Taxa de Indicação"
    };

    const formatMetricExplorerRange = (metricData) => {
        const startDate = metricData?.period?.start_date;
        const endDate = metricData?.period?.end_date;

        if (!startDate && !endDate) {
            return 'Sem período definido';
        }

        if (startDate && endDate) {
            if (startDate === endDate) {
                return formatFilterDate(startDate);
            }

            return `${formatFilterDate(startDate)} a ${formatFilterDate(endDate)}`;
        }

        if (startDate) {
            return `A partir de ${formatFilterDate(startDate)}`;
        }

        return `Até ${formatFilterDate(endDate)}`;
    };

    const formatMetricSummaryValue = (key, value) => {
        if (['total_agreement_value', 'average_ticket', 'total_economy'].includes(key)) {
            return formatKpiValue(key, value);
        }

        return value || 0;
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

    const renderMetricExplorerContent = () => {
        if (!selectedMetricViewData) {
            return <p className={styles.metricExplorerEmpty}>Não há dados das novas visões para exibir.</p>;
        }

        if (selectedMetricsView === 'general') {
            return (
                <div className={styles.metricSnapshotGrid}>
                    {GENERAL_PERIOD_METRIC_CARDS.map((card) => (
                        <KpiCard
                            key={card.key}
                            title={card.title}
                            value={formatMetricSummaryValue(card.key, selectedMetricSummary[card.key])}
                            description={card.description}
                        />
                    ))}
                </div>
            );
        }

        const participantLabel = selectedMetricsView === 'by_indicator' ? 'indicadores' : 'responsáveis';

        if (selectedMetricItems.length === 0) {
            return (
                <div className={styles.metricExplorerBody}>
                    <div className={styles.metricSummaryPills}>
                        <span className={styles.metricSummaryPill}>0 {participantLabel}</span>
                        <span className={styles.metricSummaryPill}>0 acordos</span>
                        <span className={styles.metricSummaryPill}>0 indicações convertidas</span>
                    </div>
                    <p className={styles.metricExplorerEmpty}>
                        Nenhum {selectedMetricsView === 'by_indicator' ? 'indicador' : 'responsável'} apareceu com dados no período selecionado.
                    </p>
                </div>
            );
        }

        return (
            <div className={styles.metricExplorerBody}>
                <div className={styles.metricSummaryPills}>
                    <span className={styles.metricSummaryPill}>
                        {selectedMetricSummary.participants_count || 0} {participantLabel}
                    </span>
                    <span className={styles.metricSummaryPill}>
                        {selectedMetricSummary.agreements_count || 0} acordos
                    </span>
                    <span className={styles.metricSummaryPill}>
                        {selectedMetricSummary.converted_indications_count || 0} indicações convertidas
                    </span>
                </div>

                <div className={styles.metricLeaderboardGrid}>
                    {selectedMetricItems.map((item, index) => (
                        <article
                            key={`${selectedMetricsView}-${item.id}-${item.name}`}
                            className={styles.metricLeaderboardCard}
                        >
                            <div className={styles.metricLeaderboardRank}>{index + 1}</div>
                            <div className={styles.metricLeaderboardContent}>
                                <div className={styles.metricLeaderboardHeader}>
                                    <h4 className={styles.metricLeaderboardTitle}>{item.name}</h4>
                                    <span className={styles.metricLeaderboardBadge}>
                                        {item.agreements_count || 0} acordos
                                    </span>
                                </div>

                                <div className={styles.metricLeaderboardMetrics}>
                                    <div className={styles.metricLeaderboardMetric}>
                                        <span>Acordos fechados</span>
                                        <strong>{item.agreements_count || 0}</strong>
                                    </div>
                                    <div className={styles.metricLeaderboardMetric}>
                                        <span>Indicações convertidas</span>
                                        <strong>{item.converted_indications_count || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        );
    };

    if (isInitialLoading) return <p>Carregando dashboard...</p>;
    if (error && !dashboardData) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.dashboardContainer}>
            {(isRefreshing || error) && (
                <div
                    className={`${styles.dashboardStatusNotice} ${error ? styles.dashboardStatusNoticeError : ''}`}
                    role="status"
                    aria-live="polite"
                >
                    {error ? error : 'Atualizando dados do dashboard...'}
                </div>
            )}

            {/* 1. FILTROS */}
            {canUsePeriodFilters && (
                <section className={styles.filters}>
                    <div className={styles.filtersHeader}>
                        <div className={styles.filtersTitleGroup}>
                            <div className={styles.filtersIconBadge}>
                                <FaSlidersH />
                            </div>
                            <div>
                                <h2 className={styles.filtersTitle}>Filtros do Dashboard</h2>
                                <p className={styles.filtersSubtitle}>
                                    {isManager
                                        ? 'Separe a leitura entre carteira em andamento e acordos já fechados, mantendo cliente, responsável e status no mesmo painel.'
                                        : 'Filtre seus resultados pelos períodos de carteira e fechamento para acompanhar suas métricas no dashboard.'}
                                </p>
                            </div>
                        </div>

                        <div className={styles.filtersCounter}>
                            <strong>{activeFilterCount}</strong>
                            <span>{activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
                        </div>
                    </div>

                    <div className={styles.filterGroups}>
                        <section className={styles.filterGroupCard}>
                            <div className={styles.filterGroupHeader}>
                                <span className={styles.filterGroupEyebrow}>Carteira</span>
                                <h3 className={styles.filterGroupTitle}>Período da carteira</h3>
                                <p className={styles.filterGroupSubtitle}>
                                    Afeta totais, status, performance da equipe, fluxo de indicação e casos recentes na alçada.
                                </p>
                            </div>

                            <div className={styles.filtersGrid}>
                                <div className={styles.filterField}>
                                    <label className={styles.filterLabel}>
                                        <FaCalendarAlt />
                                        <span>Data inicial da carteira</span>
                                    </label>
                                    <input
                                        className={styles.filterControl}
                                        type="date"
                                        value={portfolioStartDate}
                                        onChange={(e) => setPortfolioStartDate(e.target.value)}
                                    />
                                </div>

                                <div className={styles.filterField}>
                                    <label className={styles.filterLabel}>
                                        <FaCalendarAlt />
                                        <span>Data final da carteira</span>
                                    </label>
                                    <input
                                        className={styles.filterControl}
                                        type="date"
                                        value={portfolioEndDate}
                                        onChange={(e) => setPortfolioEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className={styles.filterGroupCard}>
                            <div className={styles.filterGroupHeader}>
                                <span className={styles.filterGroupEyebrow}>Fechamento</span>
                                <h3 className={styles.filterGroupTitle}>Período de fechamento</h3>
                                <p className={styles.filterGroupSubtitle}>
                                    Usa a data real do fechamento do acordo para valores, economia, ticket e visões de acordos fechados.
                                </p>
                            </div>

                            <div className={styles.filtersGrid}>
                                <div className={styles.filterField}>
                                    <label className={styles.filterLabel}>
                                        <FaCalendarAlt />
                                        <span>Data inicial do fechamento</span>
                                    </label>
                                    <input
                                        className={styles.filterControl}
                                        type="date"
                                        value={closingStartDate}
                                        onChange={(e) => setClosingStartDate(e.target.value)}
                                    />
                                </div>

                                <div className={styles.filterField}>
                                    <label className={styles.filterLabel}>
                                        <FaCalendarAlt />
                                        <span>Data final do fechamento</span>
                                    </label>
                                    <input
                                        className={styles.filterControl}
                                        type="date"
                                        value={closingEndDate}
                                        onChange={(e) => setClosingEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {isManager && (
                        <div className={styles.filtersGrid}>
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
                                    <option value={UNASSIGNED_RESPONSIBLE_VALUE}>Sem responsável</option>
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
                    )}

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

            <section className={styles.metricExplorerSection}>
                <div className={styles.metricExplorerHeader}>
                    <div className={styles.metricExplorerHeading}>
                        <h2 className={styles.metricExplorerTitle}>{metricsViewTitles[selectedMetricsView]}</h2>
                        <p className={styles.metricExplorerSubtitle}>{metricsViewSubtitles[selectedMetricsView]}</p>
                    </div>

                    <div className={styles.metricExplorerRange}>
                        <span className={styles.metricExplorerRangeLabel}>
                            {selectedMetricViewData?.period?.label || 'Período'}
                        </span>
                        <strong>{formatMetricExplorerRange(selectedMetricViewData)}</strong>
                    </div>
                </div>

                <div className={styles.metricExplorerControls}>
                    <div className={styles.segmentedControl} role="tablist" aria-label="Visões do dashboard">
                        {METRIC_VIEW_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className={`${styles.segmentedControlButton} ${selectedMetricsView === option.key ? styles.segmentedControlButtonActive : ''}`}
                                onClick={() => setSelectedMetricsView(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.segmentedControl} role="tablist" aria-label="Período das métricas">
                        {METRIC_PERIOD_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className={`${styles.segmentedControlButton} ${selectedMetricsPeriod === option.key ? styles.segmentedControlButtonActive : ''}`}
                                onClick={() => setSelectedMetricsPeriod(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {renderMetricExplorerContent()}
            </section>

            {/* 2. KPIs (Gestor) */}
            {isManager && (
                <div className={styles.kpiSections}>
                    <section className={styles.kpiSection}>
                        <div className={styles.kpiSectionHeader}>
                            <h3 className={styles.kpiSectionTitle}>Visão Geral de Acordos</h3>
                            <p className={styles.kpiSectionSubtitle}>
                                Casos, status e conversão seguem o período da carteira; métricas de acordo fechado respeitam a data real do fechamento.
                            </p>
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
                                        disabled={isRefreshing}
                                    >
                                        20
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.recentCasesPageSizeButton} ${recentCasesPerPage === 50 ? styles.recentCasesPageSizeButtonActive : ''}`}
                                        onClick={() => handleRecentCasesPageSizeChange(50)}
                                        disabled={isRefreshing}
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
                                    disabled={isRefreshing || !recentCasesHasPagination || recentCasesCurrentPage <= 1}
                                >
                                    {'<<'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesCurrentPage - 1)}
                                    disabled={isRefreshing || !recentCasesHasPagination || recentCasesCurrentPage <= 1}
                                >
                                    {'<'}
                                </button>
                                <span className={styles.recentCasesCurrentPage}>{recentCasesCurrentPage}</span>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesCurrentPage + 1)}
                                    disabled={isRefreshing || !recentCasesHasPagination || recentCasesCurrentPage >= recentCasesMeta.lastPage}
                                >
                                    {'>'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.recentCasesPaginationButton}
                                    onClick={() => handleRecentCasesPageChange(recentCasesMeta.lastPage)}
                                    disabled={isRefreshing || !recentCasesHasPagination || recentCasesCurrentPage >= recentCasesMeta.lastPage}
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
