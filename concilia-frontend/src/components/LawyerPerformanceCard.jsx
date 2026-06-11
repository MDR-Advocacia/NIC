import React from 'react';
import styles from '../styles/LawyerPerformanceCard.module.css';
import { FaTrophy } from 'react-icons/fa';
import MetricInfoHint from './MetricInfoHint';
import { AGREEMENT_COUNT_INFO_TEXT } from '../constants/dashboardMetrics';

const SCORE_INFO_TEXT = 'Score = (Acordos Fechados × 10) + (Economia Gerada ÷ 1.000). Quanto maior a economia e o número de acordos, maior o score.';

const LawyerPerformanceCard = ({ lawyer, rank, onViewDetails }) => {

    const handleViewDetailsClick = (e) => {
        e.preventDefault();
        onViewDetails(lawyer);
    };

    const workedCases = lawyer.worked_cases || 0;
    const deals = lawyer.performance?.deals || 0;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.lawyerInfo}>
                    <span className={styles.ranking}>{rank}º</span>
                    <div>
                        <div className={styles.lawyerName}>{lawyer.name}</div>
                        {lawyer.isLeader && <span className={styles.lawyerTitle}>Líder do Mês</span>}
                    </div>
                </div>
                <div className={styles.score}>
                    <div className={styles.scoreValue}>
                        Score: {lawyer.score}
                        <MetricInfoHint text={SCORE_INFO_TEXT} />
                    </div>
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
                        <span className={styles.metricLabelWithInfo}>
                            <span>Acordos:</span>
                            <MetricInfoHint text={AGREEMENT_COUNT_INFO_TEXT} />
                        </span>
                        <span>{deals}</span>
                    </div>
                    <div className={styles.metric}>
                        <span>Processos Tratados:</span>
                        <span className={styles.valueBlue}>{workedCases}</span>
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
                <a href="#" onClick={handleViewDetailsClick} className={styles.detailsLink}>Ver Detalhes Completos →</a>
            </div>
        </div>
    );
};

export default LawyerPerformanceCard;
