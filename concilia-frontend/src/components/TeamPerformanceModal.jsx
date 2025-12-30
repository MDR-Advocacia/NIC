import React, { useEffect } from 'react';
import styles from '../styles/TeamPerformanceModal.module.css';
import LawyerPerformanceCard from './LawyerPerformanceCard';
import { FaTimes } from 'react-icons/fa';

const TeamPerformanceModal = ({ isOpen, onClose, onViewDetails, data }) => {
    
    // 1. Hook para detectar a tecla ESC
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

    // Função auxiliar para formatar dinheiro
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    // 2. Handler para clicar no Overlay (Fundo escuro)
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        // Adicionado o evento onClick no overlay
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div 
                className={styles.modalContent} 
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                // Impede que o clique dentro do modal feche ele
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
                                        // Fecha o modal de ranking e abre o de detalhes
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