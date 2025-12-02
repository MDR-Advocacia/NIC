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
import CasesListModal from '../components/CasesListModal'; //  Importa o novo modal
import { FaTrophy } from 'react-icons/fa';
import styles from '../styles/Dashboard.module.css';


const DashboardPage = () => {
    
    const { token } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [cases, setCases] = useState([]);
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedLawyer, setSelectedLawyer] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Modais de Performance
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLawyerForDetail, setSelectedLawyerForDetail] = useState(null);

    // ADICIONADO: Estados para o novo modal de lista de casos
    const [isCasesListModalOpen, setIsCasesListModalOpen] = useState(false);
    const [modalStatusKey, setModalStatusKey] = useState(null);
    const [modalStatusName, setModalStatusName] = useState('');

    const handleOpenDetailModal = (lawyer) => {
        setSelectedLawyerForDetail(lawyer);
        setIsDetailModalOpen(true);
    };

    // REVERTIDO: Esta função agora aplica os filtros da barra superior
    const handleApplyFilters = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const [clientsResponse, lawyersResponse] = await Promise.all([
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setClients(clientsResponse.data);
            setLawyers(lawyersResponse.data.data || []);
            
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedClient) params.append('client_id', selectedClient);
            if (selectedLawyer) params.append('lawyer_id', selectedLawyer);
            if (selectedStatus) params.append('status', selectedStatus);
            
            const response = await apiClient.get(`/dashboard?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Dados recebidos da API:", response.data);
            setDashboardData(response.data);
            setCases(response.data.recent_cases || []);
        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            setError('Não foi possível carregar os dados.');
        } finally {
            setLoading(false);
        }
    // REVERTIDO: Não depende mais do 'selectedStatus' (ele é só para o filtro manual)
    }, [token, startDate, endDate, selectedClient, selectedLawyer, selectedStatus]);

    // REVERTIDO: Carrega dados apenas uma vez (e quando 'token' muda)
    useEffect(() => {
        if (token) {
            handleApplyFilters();
        }
    }, [token, handleApplyFilters]); // 'handleApplyFilters' agora é estável

    // ADICIONADO: Nova função para lidar com o clique no gráfico
    const handleChartClick = (statusKey, statusName) => {
        setModalStatusKey(statusKey);
        setModalStatusName(statusName);
        setIsCasesListModalOpen(true);
    };

    // (Função formatKpiValue e kpiTitles permanecem iguais)
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
        total_original_value: "Total Original",
        total_agreement_value: "Total Acordos",
        total_economy: "Economia Gerada",
        total_cases: "Casos Totais",
        active_cases: "Casos Ativos",
        conversion_rate: "Taxa de Conversão"
    };

    if (loading) return <p>Carregando dashboard...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.filters}>
                {/* Filtros ... */}
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
                {/* REVERTIDO: Controla 'selectedStatus' diretamente */}
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="initial_analysis">Análise Inicial</option>
                    <option value="proposal_sent">Proposta Enviada</option>
                    <option value="in_negotiation">Em Negociação</option>
                    <option value="awaiting_draft">Aguardando Minuta</option>
                    <option value="closed_deal">Acordo Fechado</option>
                    <option value="failed_deal">Acordo Frustrado</option>
                </select>
                {/* REVERTIDO: O onClick agora só aplica os filtros da barra */}
                <button onClick={handleApplyFilters} className={styles.filterButton}>
                    Aplicar Filtros
                </button>
            </div>

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

            <div className={styles.dashboardGrid}>
                <div className={styles.mainContent}>
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
                                // ATUALIZADO: Chama a função do modal
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
                            // ATUALIZADO: Chama a função do modal
                            <ProcessStageChart 
                                data={dashboardData.status_distribution} 
                                onStageClick={handleChartClick}
                            />
                        ) : <p>Não há dados de distribuição para exibir.</p>}
                    </div>

                    <div className={styles.recentCases}>
                        <h3>Casos Recentes</h3>
                        <CasesTable cases={cases} />
                    </div>
                </div>

                <div className={styles.rightSidebar}>
    <div className={styles.chartCard}>
        <h3><FaTrophy /> Performance da Equipe</h3>
        
        {/* MUDANÇA AQUI: Passamos os dados reais vindo do backend */}
        <TeamPerformancePanel 
            data={dashboardData?.team_performance || []} // <--- AQUI
            onOpenModal={() => setIsPerformanceModalOpen(true)}
            onViewDetails={handleOpenDetailModal}
        />
        
    </div>
</div>
            </div>

            {/* Modais de Performance */}
            <TeamPerformanceModal
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                onViewDetails={handleOpenDetailModal}
                
                // ADICIONE ESTA LINHA:
                data={dashboardData?.team_performance || []} 
            />
            <LawyerDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                lawyer={selectedLawyerForDetail}
            />

            {/* ADICIONADO: Renderiza o novo modal de lista de casos */}
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