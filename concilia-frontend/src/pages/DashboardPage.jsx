// src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import CasesTable from '../components/CasesTable';
import KpiCard from '../components/KpiCard';
import MetricInfoHint from '../components/MetricInfoHint';
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
import ResponsibleMultiSelect from '../components/ResponsibleMultiSelect';
import {
    FaArrowRight,
    FaBriefcase,
    FaSlidersH,
    FaCalendarAlt,
    FaBuilding,
    FaUserTie,
    FaUserTag,
    FaFlag,
    FaSearch,
    FaEraser,
    FaInfoCircle,
} from 'react-icons/fa';
import styles from '../styles/Dashboard.module.css';
import { Link } from 'react-router-dom';
import { LEGAL_CASE_STATUS_OPTIONS, UNASSIGNED_RESPONSIBLE_VALUE, POST_AGREEMENT_STATUS_ORDER } from '../constants/legalCaseStatus';
import { AGREEMENT_COUNT_INFO_TEXT } from '../constants/dashboardMetrics';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const GENERAL_KPI_ORDER = [
    'total_cases',
    'active_cases',
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
    { key: 'general', label: 'Geral' },
    { key: 'by_responsible', label: 'Responsáveis' },
    { key: 'by_indicator', label: 'Indicadores' },
];

const GENERAL_PERIOD_METRIC_CARDS = [
    {
        key: 'agreements_count',
        title: 'Acordos fechados',
        description: 'Fechamentos e casos aguardando minuta do período selecionado',
        infoTooltip: AGREEMENT_COUNT_INFO_TEXT,
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
    const [processStageView, setProcessStageView] = useState('pre');
    const [recentCasesPerPage, setRecentCasesPerPage] = useState(20);
    const [lbPage, setLbPage] = useState(1);
    const [lbPerPage, setLbPerPage] = useState(10);
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtros
    const [dashboardStartDate, setDashboardStartDate] = useState('');
    const [dashboardEndDate, setDashboardEndDate] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState([]);
    const [selectedIndicatorIds, setSelectedIndicatorIds] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');

    // Modais
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLawyerForDetail, setSelectedLawyerForDetail] = useState(null);
    const [isCasesListModalOpen, setIsCasesListModalOpen] = useState(false);
    const [modalStatusKey, setModalStatusKey] = useState(null);
    const [modalStatusName, setModalStatusName] = useState('');
    const [selectedMetricsView, setSelectedMetricsView] = useState('general');
    const selectedMetricsPeriod = 'filtered';

    const activeFilterValues = [
        dashboardStartDate,
        dashboardEndDate,
        ...(isManager ? [
            selectedClient,
            selectedLawyerIds.length > 0 ? 'responsible' : '',
            selectedIndicatorIds.length > 0 ? 'indicator' : '',
            selectedStatus,
        ] : []),
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
    const selectedLawyerNames = selectedLawyerIds
        .map((lawyerId) => {
            if (lawyerId === UNASSIGNED_RESPONSIBLE_VALUE) {
                return 'Sem responsável';
            }

            return lawyers.find((lawyer) => String(lawyer.id) === String(lawyerId))?.name;
        })
        .filter(Boolean);
    const selectedLawyerFilterLabel = (() => {
        if (selectedLawyerNames.length === 0) {
            return null;
        }

        if (selectedLawyerNames.length <= 2) {
            return selectedLawyerNames.join(' + ');
        }

        return `${selectedLawyerNames.slice(0, 2).join(' + ')} + ${selectedLawyerNames.length - 2}`;
    })();
    const selectedIndicatorNames = selectedIndicatorIds
        .map((indicatorId) => indicators.find((indicator) => String(indicator.id) === String(indicatorId))?.name)
        .filter(Boolean);
    const selectedIndicatorFilterLabel = (() => {
        if (selectedIndicatorNames.length === 0) {
            return null;
        }

        if (selectedIndicatorNames.length <= 2) {
            return selectedIndicatorNames.join(' + ');
        }

        return `${selectedIndicatorNames.slice(0, 2).join(' + ')} + ${selectedIndicatorNames.length - 2}`;
    })();
    const selectedStatusName = LEGAL_CASE_STATUS_OPTIONS.find((statusOption) => statusOption.value === selectedStatus)?.name;
    const hasDashboardDateFilter = Boolean(dashboardStartDate || dashboardEndDate);
    const metricsViewTitles = {
        general: 'Leitura rápida do período',
        by_responsible: 'Desempenho por responsável',
        by_indicator: 'Conversão por indicador',
    };
    const metricsViewSubtitles = {
        general: 'Acompanhe acordos fechados, incluindo aguardando minuta, e indicações convertidas no recorte selecionado, respeitando os filtros ativos.',
        by_responsible: 'Compare o volume fechado por responsável no período atual sem perder os filtros já aplicados no dashboard.',
        by_indicator: 'Veja quais indicadores mais converteram acordos no período ativo, mantendo a leitura filtrada da operação.',
    };

    const activeFilterChips = [
        buildDateRangeChip('Período', dashboardStartDate, dashboardEndDate),
        ...(isManager
            ? [
                selectedClientName ? `Cliente: ${selectedClientName}` : null,
                selectedLawyerFilterLabel ? `Responsáveis: ${selectedLawyerFilterLabel}` : null,
                selectedIndicatorFilterLabel ? `Indicadores: ${selectedIndicatorFilterLabel}` : null,
                selectedStatusName ? `Status: ${selectedStatusName}` : null,
            ]
            : []),
    ].filter(Boolean);

    const teamPerformanceRangeLabel = buildDateRangeChip('Período', dashboardStartDate, dashboardEndDate)
        || 'Período: todo o histórico';

    const handleOpenDetailModal = (lawyer) => {
        setSelectedLawyerForDetail(lawyer);
        setIsDetailModalOpen(true);
    };

    const loadFilterOptions = useCallback(async () => {
        if (!token || !isManager) {
            setClients([]);
            setLawyers([]);
            setIndicators([]);
            return;
        }

        try {
            const [clientsResponse, lawyersResponse, indicatorsResponse] = await Promise.all([
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users/operators', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users/indicators', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setClients(clientsResponse.data);
            setLawyers(Array.isArray(lawyersResponse.data) ? lawyersResponse.data : []);
            setIndicators(Array.isArray(indicatorsResponse.data) ? indicatorsResponse.data : []);
        } catch (err) {
            console.error('Erro ao carregar opções de filtro:', err);
            setClients([]);
            setLawyers([]);
            setIndicators([]);
        }
    }, [token, isManager]);

    const fetchDashboardData = useCallback(async ({
        dashboardStartDate: filterDashboardStartDate = '',
        dashboardEndDate: filterDashboardEndDate = '',
        selectedClient: filterClient = '',
        selectedLawyerIds: filterLawyerIds = [],
        selectedIndicatorIds: filterIndicatorIds = [],
        selectedStatus: filterStatus = '',
        recentCasesPage: filterRecentCasesPage = 1,
        recentCasesPerPage: filterRecentCasesPerPage = 20,
    } = {}) => {
        if (!token) return;

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filterDashboardStartDate) params.append('start_date', filterDashboardStartDate);
            if (filterDashboardEndDate) params.append('end_date', filterDashboardEndDate);

            if (isManager) {
                if (filterClient) params.append('client_id', filterClient);
                (Array.isArray(filterLawyerIds) ? filterLawyerIds : []).forEach((lawyerId) => {
                    if (lawyerId) params.append('lawyer_ids[]', lawyerId);
                });
                (Array.isArray(filterIndicatorIds) ? filterIndicatorIds : []).forEach((indicatorId) => {
                    if (indicatorId) params.append('indicator_user_ids[]', indicatorId);
                });
            }

            if (filterStatus) params.append('status', filterStatus);
            params.append('recent_cases_page', String(filterRecentCasesPage));
            params.append('recent_cases_per_page', String(filterRecentCasesPerPage));

            const response = await apiClient.get(`/dashboard?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDashboardData(response.data);
            const recentCasesResponse = response.data.recent_cases_global || response.data.recent_cases;

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
            dashboardStartDate,
            dashboardEndDate,
            selectedClient,
            selectedLawyerIds,
            selectedIndicatorIds,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage,
        });
    }, [
        fetchDashboardData,
        dashboardStartDate,
        dashboardEndDate,
        selectedClient,
        selectedLawyerIds,
        selectedIndicatorIds,
        selectedStatus,
        recentCasesPerPage,
    ]);

    const handleResetFilters = useCallback(() => {
        setDashboardStartDate('');
        setDashboardEndDate('');
        setSelectedClient('');
        setSelectedLawyerIds([]);
        setSelectedIndicatorIds([]);
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
            dashboardStartDate,
            dashboardEndDate,
            selectedClient,
            selectedLawyerIds,
            selectedIndicatorIds,
            selectedStatus,
            recentCasesPage: 1,
            recentCasesPerPage: nextPerPage,
        });
    }, [
        fetchDashboardData,
        recentCasesPerPage,
        dashboardStartDate,
        dashboardEndDate,
        selectedClient,
        selectedLawyerIds,
        selectedIndicatorIds,
        selectedStatus,
    ]);

    const handleRecentCasesPageChange = useCallback((nextPage) => {
        if (nextPage < 1 || nextPage > recentCasesMeta.lastPage || nextPage === recentCasesPage) {
            return;
        }

        setRecentCasesPage(nextPage);
        fetchDashboardData({
            dashboardStartDate,
            dashboardEndDate,
            selectedClient,
            selectedLawyerIds,
            selectedIndicatorIds,
            selectedStatus,
            recentCasesPage: nextPage,
            recentCasesPerPage,
        });
    }, [
        fetchDashboardData,
        recentCasesMeta.lastPage,
        recentCasesPage,
        recentCasesPerPage,
        dashboardStartDate,
        dashboardEndDate,
        selectedClient,
        selectedLawyerIds,
        selectedIndicatorIds,
        selectedStatus,
    ]);

    useEffect(() => {
        if (token) {
            if (isManager) {
                Promise.all([
                    loadFilterOptions(),
                    fetchDashboardData({}),
                ]);
                return;
            }

            fetchDashboardData({});
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
        closed_deals_today: hasDashboardDateFilter ? "Acordos Fechados no Período" : "Acordos Fechados Hoje",
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
            return 'Todo o histórico';
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

    const renderAgreementCountLabel = (value, label = 'acordos') => (
        <span className={styles.metricInlineInfo}>
            <span>{value} {label}</span>
            <MetricInfoHint text={AGREEMENT_COUNT_INFO_TEXT} />
        </span>
    );

    const renderAgreementMetricLabel = (label) => (
        <span className={styles.metricInlineInfo}>
            <span>{label}</span>
            <MetricInfoHint text={AGREEMENT_COUNT_INFO_TEXT} />
        </span>
    );

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
                        infoTooltip={key === 'closed_deals_today' ? AGREEMENT_COUNT_INFO_TEXT : undefined}
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
                            infoTooltip={card.infoTooltip}
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

        const isIndicatorView = selectedMetricsView === 'by_indicator';

        return (
            <div className={styles.metricExplorerBody}>
                <div className={styles.metricSummaryPills}>
                    <span className={styles.metricSummaryPill}>
                        {selectedMetricSummary.participants_count || 0} {participantLabel}
                    </span>
                    {isIndicatorView && (
                        <span className={styles.metricSummaryPill}>
                            {selectedMetricSummary.total_indicated || 0} indicados
                        </span>
                    )}
                    <span className={styles.metricSummaryPill}>
                        {renderAgreementCountLabel(selectedMetricSummary.agreements_count || 0)}
                    </span>
                </div>

                {(() => {
                    const totalItems = selectedMetricItems.length;
                    const totalPages = Math.ceil(totalItems / lbPerPage);
                    const safePage = Math.min(lbPage, totalPages || 1);
                    const startIdx = (safePage - 1) * lbPerPage;
                    const pageItems = selectedMetricItems.slice(startIdx, startIdx + lbPerPage);

                    return (
                        <>
                            <div className={styles.leaderboardTableWrap}>
                                <table className={styles.leaderboardTable}>
                                    <thead>
                                        <tr>
                                            <th className={styles.lbColRank}>#</th>
                                            <th className={styles.lbColName}>Nome</th>
                                            {isIndicatorView && <th className={styles.lbColNum}>Indicados</th>}
                                            <th className={styles.lbColNum}>Acordos</th>
                                            {isIndicatorView && <th className={styles.lbColNum}>Contraindicados</th>}
                                            {isIndicatorView && <th className={styles.lbColNum}>Frustrado</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((item, idx) => {
                                            const globalIndex = startIdx + idx;
                                            return (
                                                <tr key={`${selectedMetricsView}-${item.id}-${item.name}`}>
                                                    <td className={styles.lbCellRank}>
                                                        <span className={styles.lbRankBadge}>{globalIndex + 1}</span>
                                                    </td>
                                                    <td className={styles.lbCellName}>
                                                        <span className={styles.lbNameText}>{item.name}</span>
                                                    </td>
                                                    {isIndicatorView && (
                                                        <td className={styles.lbCellNum}>{item.total_indicated || 0}</td>
                                                    )}
                                                    <td className={styles.lbCellNum}>
                                                        <a
                                                            href={(() => {
                                                                const p = new URLSearchParams();
                                                                if (isIndicatorView) {
                                                                    p.append('indicator_user_ids', item.id);
                                                                } else {
                                                                    p.append('lawyer_ids', item.id);
                                                                }
                                                                p.append('statuses', 'closed_deal');
                                                                p.append('statuses', 'awaiting_draft');
                                                                if (dashboardStartDate) p.append('date_from', dashboardStartDate);
                                                                if (dashboardEndDate) p.append('date_to', dashboardEndDate);
                                                                return `/cases?${p.toString()}`;
                                                            })()}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.lbAgreementLink}
                                                            title={`Ver acordos de ${item.name}`}
                                                        >
                                                            {item.agreements_count || 0}
                                                        </a>
                                                    </td>
                                                    {isIndicatorView && (
                                                        <td className={styles.lbCellNum} style={{ color: item.contra_indicated_count > 0 ? 'var(--danger-text, #dc2626)' : undefined, fontWeight: item.contra_indicated_count > 0 ? 600 : undefined }}>
                                                            {item.contra_indicated_count || 0}
                                                        </td>
                                                    )}
                                                    {isIndicatorView && (
                                                        <td className={styles.lbCellNum} style={{ color: item.failed_deal_count > 0 ? 'var(--danger-text, #dc2626)' : undefined, fontWeight: item.failed_deal_count > 0 ? 600 : undefined }}>
                                                            {item.failed_deal_count || 0}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.lbPagination}>
                                <div className={styles.lbPagInfo}>
                                    Mostrando {startIdx + 1}–{Math.min(startIdx + lbPerPage, totalItems)} de {totalItems}
                                </div>
                                <div className={styles.lbPagControls}>
                                    <div className={styles.lbPerPageSelect}>
                                        <span>Por página:</span>
                                        {[10, 25, 50].map((n) => (
                                            <button
                                                key={n}
                                                className={`${styles.lbPerPageBtn} ${lbPerPage === n ? styles.lbPerPageBtnActive : ''}`}
                                                onClick={() => { setLbPerPage(n); setLbPage(1); }}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className={styles.lbPageNav}>
                                            <button
                                                className={styles.lbPageBtn}
                                                disabled={safePage <= 1}
                                                onClick={() => setLbPage((p) => Math.max(1, p - 1))}
                                            >
                                                <FaChevronLeft />
                                            </button>
                                            <span className={styles.lbPageLabel}>{safePage} / {totalPages}</span>
                                            <button
                                                className={styles.lbPageBtn}
                                                disabled={safePage >= totalPages}
                                                onClick={() => setLbPage((p) => Math.min(totalPages, p + 1))}
                                            >
                                                <FaChevronRight />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}
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
                                        ? 'Use um único período para todos os dashboards e refine por cliente, responsáveis, indicadores e status.'
                                        : 'Use um único período para acompanhar todos os seus indicadores no dashboard.'}
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
                                <span className={styles.filterGroupEyebrow}>Período</span>
                                <h3 className={styles.filterGroupTitle}>Período do dashboard</h3>
                                <p className={styles.filterGroupSubtitle}>
                                    Afeta a visão geral, responsáveis, indicadores, performance da equipe, acordos fechados e casos recentes.
                                </p>
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
                                        value={dashboardStartDate}
                                        onChange={(e) => setDashboardStartDate(e.target.value)}
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
                                        value={dashboardEndDate}
                                        onChange={(e) => setDashboardEndDate(e.target.value)}
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
                                    <span>Responsáveis</span>
                                </label>
                                <ResponsibleMultiSelect
                                    selectedValues={selectedLawyerIds}
                                    options={lawyers}
                                    onChange={setSelectedLawyerIds}
                                    unassignedValue={UNASSIGNED_RESPONSIBLE_VALUE}
                                />
                            </div>

                            <div className={styles.filterField}>
                                <label className={styles.filterLabel}>
                                    <FaUserTag />
                                    <span>Indicadores</span>
                                </label>
                                <ResponsibleMultiSelect
                                    selectedValues={selectedIndicatorIds}
                                    options={indicators}
                                    onChange={setSelectedIndicatorIds}
                                    includeUnassigned={false}
                                    placeholder="Todos os indicadores"
                                    searchPlaceholder="Buscar indicador"
                                    emptyMessage="Nenhum indicador encontrado."
                                    summaryPluralLabel="indicadores"
                                    ariaLabel="Filtro de indicadores"
                                />
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

                            <div className={styles.filterField}>
                                <label className={styles.filterLabel}>
                                    <FaSlidersH />
                                    <span>Tipo de dashboard</span>
                                </label>
                                <div className={`${styles.segmentedControl} ${styles.dashboardViewControl}`} role="tablist" aria-label="Tipo de dashboard">
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

                {renderMetricExplorerContent()}
            </section>

            {/* 2. KPIs (Gestor) */}
            {isManager && (
                <div className={styles.kpiSections}>
                    <section className={styles.kpiSection}>
                        <div className={styles.kpiSectionHeader}>
                            <h3 className={styles.kpiSectionTitle}>Visão Geral de Acordos</h3>
                            <span className={styles.unfilteredInfo} title="Casos, status, acordos e conversão seguem o período único do dashboard.">
                                <FaInfoCircle />
                            </span>
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

                    {/* Distribuição por Etapa movida para fora do bloco filtrado */}

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
                                <div>
                                    <h3>Performance da Equipe</h3>
                                    <p>
                                        Destaque dos advogados com melhor score no período selecionado, mantendo o acesso ao ranking completo.
                                    </p>
                                </div>
                                <span className={styles.teamPerformancePeriodChip}>{teamPerformanceRangeLabel}</span>
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
                </div>

            </div>

            {/* === SEÇÕES SEM FILTRO DE PERÍODO === */}
            <div className={styles.unfilteredSections}>
                    <div className={styles.statusDistribution}>
                        <div className={styles.unfilteredSectionHeader}>
                            <h3>Distribuição por Etapa do Processo</h3>
                            <div className={styles.stageToggle}>
                                <button
                                    type="button"
                                    className={`${styles.stageToggleBtn} ${processStageView === 'pre' ? styles.stageToggleBtnActive : ''}`}
                                    onClick={() => setProcessStageView('pre')}
                                >
                                    Pré-Acordo
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.stageToggleBtn} ${processStageView === 'post' ? styles.stageToggleBtnActive : ''}`}
                                    onClick={() => setProcessStageView('post')}
                                >
                                    Pós-Acordo
                                </button>
                            </div>
                            <span className={styles.unfilteredInfo} title="Esta seção exibe o estado atual de todos os casos, sem ser afetada pelo filtro de período.">
                                <FaInfoCircle />
                            </span>
                        </div>
                        {processStageView === 'pre' && dashboardData && (dashboardData.status_distribution_global || dashboardData.status_distribution) ? (
                            <ProcessStageChart
                                data={dashboardData.status_distribution_global || dashboardData.status_distribution}
                                onStageClick={handleChartClick}
                            />
                        ) : null}
                        {processStageView === 'post' && dashboardData && dashboardData.status_distribution_global_post ? (
                            <ProcessStageChart
                                data={dashboardData.status_distribution_global_post}
                                statusOrder={POST_AGREEMENT_STATUS_ORDER}
                                onStageClick={handleChartClick}
                            />
                        ) : processStageView === 'post' ? <p>Não há dados de pós-acordo para exibir.</p> : null}
                    </div>

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
                            <span className={styles.unfilteredInfo} title="Esta seção exibe os casos mais recentes, sem ser afetada pelo filtro de período.">
                                <FaInfoCircle />
                            </span>
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
