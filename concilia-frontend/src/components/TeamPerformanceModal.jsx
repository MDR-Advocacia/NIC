import React from 'react';
import styles from '../styles/TeamPerformanceModal.module.css';
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
            {/* Adicionado maxHeight para garantir que o modal não estoure a tela em monitores pequenos */}
            <div className={styles.modalContent} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>
                
                {/* Título fixo no topo */}
                <h2 style={{ flexShrink: 0 }}>Ranking Completo da Equipe</h2>
                
                {/* CORREÇÃO DO BUG DE CORTE:
                   1. flex: 1 -> Ocupa o espaço restante
                   2. overflowY: 'auto' -> Cria barra de rolagem se precisar
                   3. minHeight: 0 -> Importante para o Flexbox não travar
                   4. paddingRight: '10px' -> Para a barra de rolagem não colar no card
                */}
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