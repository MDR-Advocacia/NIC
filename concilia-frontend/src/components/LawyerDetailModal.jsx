// src/components/LawyerDetailModal.jsx
// ATUALIZADO: Fecha ao clicar fora e usa o botão "X"

import React from 'react';
import styles from '../styles/LawyerDetailModal.module.css';
import { FaTimes } from 'react-icons/fa'; // ATUALIZADO: Importa o "X"

// Dados fictícios (mantidos)
const mockLawyerDetails = {
    name: 'Dr. Carlos Santos',
    isLeader: true,
    kpis: [
        { label: 'Economia Gerada', value: 'R$ 485.200', subValue: 'Meta: R$ 500.000', color: '#38a169' },
        { label: 'Taxa de Conversão', value: '78.3%', subValue: 'Acordos fechados', color: '#3b82f6' },
        { label: 'Casos Ativos', value: '8', subValue: 'Em andamento', color: '#f59e0b' },
        { label: 'Acordos Fechados', value: '15', subValue: 'Esse mês', color: '#8b5cf6' }
    ],
    goal: {
        achieved: 485200,
        total: 500000,
        percentage: 97,
        avgDiscount: '41.2%',
        totalCases: 23,
        successRate: '65%'
    },
    history: [
        { id: '#001234', client: 'Banco do Brasil', author: 'João Silva', value: 'R$ 45.000', economy: 'R$ 18.500', status: 'Finalizada', priority: 'Alta' }
    ]
};

const LawyerDetailModal = ({ isOpen, onClose, lawyer }) => {
    if (!isOpen) return null;

    const details = mockLawyerDetails;

    return (
        // ATUALIZADO: Adicionado onClick={onClose} ao overlay
        <div className={styles.modalOverlay} onClick={onClose}>
            {/* ATUALIZADO: Adicionado stopPropagation ao conteúdo */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                
                {/* ATUALIZADO: Botão "X" agora está no topo e separado */}
                <button onClick={onClose} className={styles.closeButton}>
                    <FaTimes />
                </button>
                
                <header className={styles.modalHeader}>
                    {/* O botão de seta foi removido daqui */}
                    <h2 className={styles.lawyerName}>{details.name}</h2>
                    {details.isLeader && <span className={styles.leaderTag}>Líder do Mês</span>}
                </header>

                <main className={styles.modalBody}>
                    <section>
                        <h3>Métricas de Performance</h3>
                        <div className={styles.kpiGrid}>
                            {details.kpis.map(kpi => (
                                <div key={kpi.label} className={styles.kpiCard} style={{ borderBottomColor: kpi.color }}>
                                    <label>{kpi.label}</label>
                                    <p className={styles.value}>{kpi.value}</p>
                                    <p className={styles.subValue}>{kpi.subValue}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h3>Progresso da Meta Mensal</h3>
                        <div className={styles.progressBarContainer}>
                            <div className={styles.progressLabels}>
                                <span>Economia vs Meta</span>
                                <span>{details.goal.percentage}% da meta atingida</span>
                            </div>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${details.goal.percentage}%` }}></div>
                            </div>
                               <div className={styles.progressLabels}>
                                <span>Alcançado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.goal.achieved)}</span>
                                <span>Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.goal.total)}</span>
                            </div>
                        </div>
                    </section>
                    
                    {/* A tabela de histórico será implementada no futuro */}
                </main>
            </div>
        </div>
    );
};

export default LawyerDetailModal;