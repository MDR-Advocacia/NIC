import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserManagement.module.css';
import { FaSync, FaSearch, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';
import KpiCard from '../components/KpiCard';

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

    // Filtragem local
    const filteredLogs = logs.filter(log => 
        (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
        (log.user_name && log.user_name.toLowerCase().includes(search.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
    );

    const getActionStyle = (action) => {
        const act = action ? action.toLowerCase() : '';
        if (act.includes('exclu')) return { bg: '#fee2e2', color: '#991b1b' };
        if (act.includes('cria') || act.includes('novo')) return { bg: '#dcfce7', color: '#166534' };
        if (act.includes('edi') || act.includes('atualiza')) return { bg: '#fef3c7', color: '#b45309' };
        if (act.includes('login')) return { bg: '#e0f2fe', color: '#0369a1' };
        return { bg: '#f1f5f9', color: '#475569' };
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1>Auditoria do Sistema</h1>
                    <p>Rastreabilidade completa de ações e segurança (Dados Reais)</p>
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
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FaSearch style={{ position: 'absolute', left: 15, color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por usuário, ação..." 
                        className={styles.searchInput}
                        style={{ paddingLeft: '40px' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </section>

            <section className={styles.tableContainer}>
                {loading ? (
                    <p style={{padding: '20px', textAlign: 'center'}}>Carregando histórico real...</p>
                ) : error ? (
                    <div style={{padding: '20px', textAlign: 'center', color: '#ef4444'}}>
                        <FaExclamationTriangle /> {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>
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