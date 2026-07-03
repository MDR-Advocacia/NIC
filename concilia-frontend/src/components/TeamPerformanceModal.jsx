import React, { useEffect } from 'react';
import styles from '../styles/TeamPerformanceModal.module.css';
import { FaTimes, FaTrophy, FaMedal } from 'react-icons/fa';

const TeamPerformanceModal = ({ isOpen, onClose, onViewDetails, data }) => {

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <FaTrophy className={styles.rankGold} />;
        if (rank === 2) return <FaMedal className={styles.rankSilver} />;
        if (rank === 3) return <FaMedal className={styles.rankBronze} />;
        return null;
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>

                <h2>Ranking Completo da Equipe</h2>

                <div className={styles.rankingListHeader}>
                    <span className={styles.colRank}>#</span>
                    <span className={styles.colName}>Nome</span>
                    <span className={styles.colMetric}>Score</span>
                    <span className={styles.colMetric}>Acordos</span>
                    <span className={styles.colMetric}>Conversão</span>
                    <span className={styles.colMetricWide}>Economia</span>
                    <span className={styles.colAction}></span>
                </div>

                <div className={styles.lawyersList}>
                    {data && data.length > 0 ? (
                        data.map((lawyerBackend, index) => {
                            const rank = index + 1;
                            const mappedLawyer = {
                                id: lawyerBackend.id,
                                name: lawyerBackend.name,
                                isLeader: index === 0,
                                score: lawyerBackend.score,
                                ranking: rank,
                                total_cases: lawyerBackend.total_cases,
                                worked_cases: lawyerBackend.worked_cases,
                                performance: {
                                    economy: formatCurrency(lawyerBackend.economy),
                                    conversion: lawyerBackend.conversion_rate,
                                    deals: lawyerBackend.closed_deals
                                },
                                products: {
                                    used: lawyerBackend.products_count,
                                    value: formatCurrency(lawyerBackend.products_proposed_value),
                                    economy: formatCurrency(lawyerBackend.products_economy)
                                },
                                livelo_deals: lawyerBackend.livelo_deals || 0,
                                ourocap_deals: lawyerBackend.ourocap_deals || 0,
                            };

                            return (
                                <div
                                    key={mappedLawyer.id}
                                    className={`${styles.rankingRow} ${rank <= 3 ? styles.rankingRowTop : ''}`}
                                >
                                    <span className={styles.colRank}>
                                        {getRankIcon(rank)}
                                        <span className={styles.rankNumber}>{rank}º</span>
                                    </span>
                                    <span className={styles.colName}>
                                        <span className={styles.lawyerName}>{mappedLawyer.name}</span>
                                        {rank === 1 && <span className={styles.leaderBadge}>Líder</span>}
                                    </span>
                                    <span className={`${styles.colMetric} ${styles.scoreValue}`}>
                                        {mappedLawyer.score}
                                    </span>
                                    <span className={styles.colMetric}>
                                        {mappedLawyer.performance.deals}
                                    </span>
                                    <span className={styles.colMetric}>
                                        {mappedLawyer.performance.conversion}%
                                    </span>
                                    <span className={`${styles.colMetricWide} ${styles.economyValue}`}>
                                        {mappedLawyer.performance.economy}
                                    </span>
                                    <span className={styles.colAction}>
                                        <button
                                            className={styles.detailsBtn}
                                            onClick={() => {
                                                onClose();
                                                onViewDetails(mappedLawyer);
                                            }}
                                        >
                                            Detalhes
                                        </button>
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <p style={{ textAlign: 'center', padding: '20px' }}>Nenhum dado de performance disponível.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamPerformanceModal;
