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
import { FaTrophy, FaArrowRight, FaBriefcase } from 'react-icons/fa'; 
import styles from '../styles/Dashboard.module.css';
import { Link } from 'react-router-dom';
import { LEGAL_CASE_STATUS_OPTIONS } from '../constants/legalCaseStatus';

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

    const handleOpenDetailModal = (lawyer) => {
        setSelectedLawyerForDetail(lawyer);
        setIsDetailModalOpen(true);
    };

    const handleApplyFilters = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            if (isManager) {
                const [clientsResponse, lawyersResponse] = await Promise.all([
                    apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                    apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setClients(clientsResponse.data);
                setLawyers(lawyersResponse.data.data || []);
            }
            
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            if (isManager) {
                if (selectedClient) params.append('client_id', selectedClient);
                if (selectedLawyer) params.append('lawyer_id', selectedLawyer);
            }
            
            if (selectedStatus) params.append('status', selectedStatus);
            
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
    }, [token, startDate, endDate, selectedClient, selectedLawyer, selectedStatus, isManager]);

    useEffect(() => {
        if (token) {
            handleApplyFilters();
        }
    }, [token, handleApplyFilters]);

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
                return formatCurrency(value);
            case 'conversion_rate':
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
        conversion_rate: "Taxa de Conversão"
    };

    if (loading) return <p>Carregando dashboard...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.dashboardContainer}>
            
            {/* 1. FILTROS (Gestor) */}
            {isManager && (
                <div className={styles.filters}>
                    <label>Data Início:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label>Data Fim:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <label>Cliente:</label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                        <option value="">Todos</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <label>Advogado:</label>
                    <select value={selectedLawyer} onChange={(e) => setSelectedLawyer(e.target.value)}>
                        <option value="">Todos</option>
                        {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                    </select>
                    <label>Status:</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">Todos</option>
                        {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>
                        ))}
                    </select>
                    <button onClick={handleApplyFilters} className={styles.filterButton}>
                        Aplicar Filtros
                    </button>
                </div>
            )}

            {/* 2. KPIs (Gestor) */}
            {isManager && (
                <div className={styles.kpiGrid}>
                    {dashboardData && dashboardData.kpis ? (
                        Object.entries(dashboardData.kpis).map(([key, value]) => (
                            <KpiCard
                                key={key}
                                title={kpiTitles[key] || key}
                                value={formatKpiValue(key, value)}
                            />
                        ))
                    ) : <p>Não há dados de KPI para exibir.</p>}
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
