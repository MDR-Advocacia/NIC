import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import styles from '../styles/SystemLogs.module.css';

const SystemLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/audit-logs')
            .then(res => setLogs(res.data))
            .catch(err => console.error("Erro ao buscar logs", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Auditoria do Sistema</h1>
                <p>Registro de atividades e segurança.</p>
            </div>

            <div className={styles.tableContainer}>
                {loading ? <p>Carregando...</p> : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Usuário</th>
                                    <th>Ação</th>
                                    <th>Descrição</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                        <td>
                                            {log.user ? (
                                                <span className={styles.userBadge}>{log.user.name}</span>
                                            ) : 'Sistema'}
                                        </td>
                                        <td><span className={styles.actionTag}>{log.action}</span></td>
                                        <td>{log.description}</td>
                                        <td>{log.ip_address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogsPage;