// src/components/CasesListModal.jsx
// NOVO COMPONENTE para exibir a lista de casos

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/CasesListModal.module.css'; // O CSS que acabamos de criar
import { Link } from 'react-router-dom';
import { getLegalCaseStatusDetails } from '../constants/legalCaseStatus';
// O mesmo estilo de tag
const tagStyle = {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
};

const CasesListModal = ({ isOpen, onClose, statusKey, statusName }) => {
    const { token } = useAuth();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(false);

    // Funções de formatação (copiadas do CasesTable)
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR').format(date);
    };
    // Fim das funções de formatação

    // Busca os casos quando o modal abre ou o statusKey muda
    useEffect(() => {
        if (isOpen && statusKey) {
            const fetchCasesByStatus = async () => {
                setLoading(true);
                setCases([]); // Limpa os casos antigos
                try {
                    const params = new URLSearchParams({ status: statusKey });
                    const response = await apiClient.get(`/cases?${params.toString()}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setCases(response.data); // O endpoint /cases deve retornar um array
                } catch (error) {
                    console.error("Erro ao buscar casos por status:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchCasesByStatus();
        }
    }, [isOpen, statusKey, token]);

    if (!isOpen) {
        return null; // Não renderiza nada se estiver fechado
    }

    // Busca a cor para o título
    const titleColor = getLegalCaseStatusDetails(statusKey).color;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <header className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        Casos em: <span style={{ color: titleColor }}>{statusName}</span>
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </header>

                <main className={styles.modalBody}>
                    {loading ? (
                        <p>Carregando casos...</p>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Processo</th>
                                    <th>Cliente</th>
                                    <th>Autor</th>
                                    <th>Valor da Causa</th>
                                    <th>Advogado</th>
                                    <th>Data Distribuição</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.length > 0 ? cases.map((legalCase) => (
                                    <tr key={legalCase.id}>
                                        <td>
                                            <Link to={`/cases/${legalCase.id}`} onClick={onClose}>
                                                {legalCase.case_number}
                                            </Link>
                                        </td>
                                        <td>{legalCase.client?.name || 'N/A'}</td>
                                        <td>{legalCase.opposing_party}</td>
                                        <td>{formatCurrency(legalCase.cause_value)}</td>
                                        <td>{legalCase.lawyer?.name || 'N/A'}</td>
                                        <td>{formatDate(legalCase.start_date || legalCase.created_at)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                            Nenhum caso encontrado para este status.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CasesListModal;
