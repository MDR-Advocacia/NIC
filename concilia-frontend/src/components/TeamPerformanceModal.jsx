import React, { useEffect } from 'react';
import styles from '../styles/TeamPerformanceModal.module.css';
import LawyerPerformanceCard from './LawyerPerformanceCard';
import { FaTimes } from 'react-icons/fa';

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

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div
                className={styles.modalContent}
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>

                <h2 style={{ flexShrink: 0 }}>Ranking Completo da Equipe</h2>

                <div
                    className={styles.lawyersList}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        paddingRight: '5px'
                    }}
                >
                    {data && data.length > 0 ? (
                        data.map((lawyerBackend, index) => {
                            const mappedLawyer = {
                                id: lawyerBackend.id,
                                name: lawyerBackend.name,
                                isLeader: index === 0,
                                score: lawyerBackend.score,
                                ranking: index + 1,
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
                                <LawyerPerformanceCard
                                    key={mappedLawyer.id}
                                    lawyer={mappedLawyer}
                                    rank={index + 1}
                                    onViewDetails={() => {
                                        onClose();
                                        onViewDetails(mappedLawyer);
                                    }}
                                />
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
