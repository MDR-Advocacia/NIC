import React from 'react';
import styles from '../styles/TeamPerformanceModal.module.css'; // ou o caminho do seu CSS
import LawyerPerformanceCard from './LawyerPerformanceCard';
import { FaTimes } from 'react-icons/fa';

const TeamPerformanceModal = ({ isOpen, onClose, onViewDetails, data }) => {
    if (!isOpen) return null;

    // Função auxiliar para formatar dinheiro
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>
                
                <h2>Ranking Completo da Equipe</h2>
                
                <div className={styles.lawyersList}>
                    {data && data.length > 0 ? (
                        data.map((lawyerBackend, index) => {
                             // Mapeamento dos dados reais para o visual
                             const mappedLawyer = {
                                id: lawyerBackend.id,
                                name: lawyerBackend.name,
                                isLeader: index === 0,
                                score: lawyerBackend.score,
                                ranking: index + 1,
                                performance: { 
                                    economy: formatCurrency(lawyerBackend.economy), 
                                    conversion: lawyerBackend.conversion_rate, 
                                    deals: lawyerBackend.closed_deals 
                                },
                                products: { 
        used: lawyerBackend.products_count, 
        value: formatCurrency(lawyerBackend.products_proposed_value), 
        economy: formatCurrency(lawyerBackend.products_economy) 
    }
};

                            return (
                                <LawyerPerformanceCard
                                    key={mappedLawyer.id}
                                    lawyer={mappedLawyer}
                                    rank={index + 1}
                                    onViewDetails={() => {
                                        onViewDetails(mappedLawyer);
                                        onClose();
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