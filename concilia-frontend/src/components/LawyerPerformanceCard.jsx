// src/components/LawyerPerformanceCard.jsx
import React from 'react';
import styles from '../styles/LawyerPerformanceCard.module.css';
import { FaTrophy } from 'react-icons/fa';

// Adicione a nova prop 'onViewDetails'
const LawyerPerformanceCard = ({ lawyer, rank, onViewDetails }) => {
    
    const handleViewDetailsClick = (e) => {
        e.preventDefault(); // Impede o link de navegar
        onViewDetails(lawyer); // Chama a função do componente pai com os dados do advogado
    };

    return (
        <div className={styles.card}>
            {/* ... o restante do componente permanece igual ... */}
            <div className={styles.header}>
                <div className={styles.lawyerInfo}>
                    <span className={styles.ranking}>{rank}º</span>
                    <div>
                        <div className={styles.lawyerName}>{lawyer.name}</div>
                        {lawyer.isLeader && <span className={styles.lawyerTitle}>Líder do Mês</span>}
                    </div>
                </div>
                <div className={styles.score}>
                    <div className={styles.scoreValue}>Score: {lawyer.score}</div>
                    <div className={styles.scoreRank}>Ranking: {lawyer.ranking}º lugar</div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <h4><FaTrophy /> Performance Geral</h4>
                    <div className={styles.metric}>
                        <span>Economia Total:</span>
                        <span className={styles.valueGreen}>{lawyer.performance.economy}</span>
                    </div>
                    <div className={styles.metric}>
                        <span>Conversão:</span>
                        <span className={styles.valueBlue}>{lawyer.performance.conversion}%</span>
                    </div>
                    <div className={styles.metric}>
                        <span>Acordos:</span>
                        <span>{lawyer.performance.deals}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>Produtos & Benefícios</h4>
                    <div className={styles.metric}>
                        <span>Utilizados:</span>
                        <span>{lawyer.products.used}</span>
                    </div>
                     <div className={styles.metric}>
                        <span>Valor Proposto:</span>
                        <span className={styles.valueGreen}>{lawyer.products.value}</span>
                    </div>
                    <div className={styles.metric}>
                        <span>Economia c/ Produtos:</span>
                        <span className={styles.valueGreen}>{lawyer.products.economy}</span>
                    </div>
                </div>
            </div>
            
            <div className={styles.footer}>
                {/* Adicione o onClick ao link */}
                <a href="#" onClick={handleViewDetailsClick} className={styles.detailsLink}>Ver Detalhes Completos →</a>
            </div>
        </div>
    );
};

export default LawyerPerformanceCard;