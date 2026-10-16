import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserManagement.module.css';
import { FaSync, FaSearch, FaShieldAlt, FaExclamationTriangle, FaSlidersH, FaEraser } from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import MetricInfoHint from '../components/MetricInfoHint';
import PageSkeleton from '../components/PageSkeleton';

const SystemLogsPage = () => {
    const { token } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            // Busca os dados REAIS do backend
            const response = await apiClient.get('/audit-logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Logs recebidos:", response.data); // Para debug
            setLogs(response.data);
        } catch (err) {
            console.error("Erro ao buscar logs:", err);
            setError("Não foi possível carregar o histórico. Verifique sua permissão.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const activeFilterChips = search.trim() ? [`Busca: ${search.trim()}`] : [];
    const activeFilterCount = activeFilterChips.length;

    // Filtragem local
    const filteredLogs = logs.filter(log => 
        (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
        (log.user_name && log.user_name.toLowerCase().includes(search.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
    );

    const getActionStyle = (action) => {
        const act = action ? action.toLowerCase() : '';
        if (act.includes('exclu')) return { bg: 'var(--danger-soft)', color: 'var(--danger-text)' };
        if (act.includes('cria') || act.includes('novo')) return { bg: 'var(--success-soft)', color: 'var(--success-text)' };
        if (act.includes('edi') || act.includes('atualiza')) return { bg: 'var(--warning-soft)', color: 'var(--warning-text)' };
        if (act.includes('login')) return { bg: 'var(--accent-pill-bg)', color: 'var(--accent-pill-text)' };
        return { bg: 'var(--neutral-soft)', color: 'var(--text-secondary)' };
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.titleWithHint}>
                        Auditoria do Sistema
                        <MetricInfoHint placement="bottom" text="Rastreabilidade completa de ações e segurança (Dados Reais)." />
                    </h1>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.actionButton} onClick={fetchLogs}>
                        <FaSync /> Atualizar Lista
                    </button>
                </div>
            </header>

            <section className={styles.kpiGrid}>
                <KpiCard title="Total de Registros" value={logs.length} />
                <KpiCard title="Usuários no Registro" value={[...new Set(logs.map(l => l.user_name))].length} />
            </section>

            <section className={styles.filtersContainer}>
                <div className={styles.filtersHeader}>
                    <div className={styles.filtersTitleBlock}>
                        <div className={styles.filtersIcon}>
                            <FaSlidersH />
                        </div>
                        <div className={styles.filtersHeading}>
                            <h3 className={styles.titleWithHint}>
                                Filtros da Auditoria
                                <MetricInfoHint
                                    placement="bottom"
                                    text="Busque rapidamente por usuário, ação ou detalhe técnico para revisar o histórico com mais agilidade."
                                />
                            </h3>
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
                            Buscar nos logs
                        </span>
                        <input 
                            type="text" 
                            placeholder="Usuário, ação ou detalhe..." 
                            className={styles.filterControl}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                </div>

                <div className={styles.filtersFooter}>
                    <div className={styles.filtersSummary}>
                        {activeFilterCount > 0 ? (
                            activeFilterChips.map((chip) => (
                                <span key={chip} className={styles.filterChip}>
                                    {chip}
                                </span>
                            ))
                        ) : (
                            <span className={styles.filtersHint}>
                                O histórico completo está visível no momento.
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.clearFiltersButton}
                        onClick={() => setSearch('')}
                        disabled={activeFilterCount === 0}
                    >
                        <FaEraser />
                        Limpar filtros
                    </button>
                </div>
            </section>

            <section className={styles.tableContainer}>
                {loading ? (
                    <PageSkeleton rows={8} label="Carregando histórico real" />
                ) : error ? (
                    <div style={{padding: '20px', textAlign: 'center', color: 'var(--danger-primary)'}}>
                        <FaExclamationTriangle /> {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        <p>Nenhum log registrado no banco de dados ainda.</p>
                        <small>Crie um usuário ou faça login para gerar o primeiro registro.</small>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Data / Hora</th>
                                <th>Usuário</th>
                                <th>Ação Realizada</th>
                                <th>Detalhes Técnicos</th>
                                <th>IP Origem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => {
                                const style = getActionStyle(log.action);
                                return (
                                    <tr key={log.id}>
                                        <td style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.userAvatar} style={{width: 30, height: 30, fontSize: '0.8rem'}}>
                                                    <FaShieldAlt />
                                                </div>
                                                <div className={styles.userName}>
                                                    {log.user_name || 'Sistema'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.tag} style={{ backgroundColor: style.bg, color: style.color }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{fontSize: '0.9rem', maxWidth: '450px', color: 'var(--text-primary)'}}>
                                            {log.details}
                                        </td>
                                        <td style={{fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                                            {log.ip_address}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
};

export default SystemLogsPage;
