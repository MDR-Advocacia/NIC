import React from 'react';
import LawyerPerformanceCard from './LawyerPerformanceCard';
import styles from '../styles/TeamPerformancePanel.module.css';

const TeamPerformancePanel = ({ data, onOpenModal, onViewDetails }) => {
    
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const topLawyers = data ? data.slice(0, 2) : [];

    if (topLawyers.length === 0) {
        return (
            <div className={styles.panel}>
                <div className={styles.panelHeader}><h4>Top Advogados</h4></div>
                <div className={styles.panelBody} style={{ padding: '20px', textAlign: 'center', color: '#ccc' }}>
                    <p>Nenhum dado de performance ainda.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h4>Top {topLawyers.length} Advogados</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenModal(); }} className={styles.viewAllLink}>
                    Ver Todos &gt;
                </a>
            </div>
            
            <div className={styles.panelBody}>
                {topLawyers.map((lawyerBackend, index) => {
                    
                    // Objeto SEGURO e COMPLETO para o Modal
                    const mappedLawyer = {
                        id: lawyerBackend.id,
                        name: lawyerBackend.name || 'Advogado',
                        isLeader: index === 0,
                        score: lawyerBackend.score || 0,
                        ranking: index + 1,
                        total_cases: lawyerBackend.total_cases || 0, // Essencial para o cálculo
                        
                        performance: { 
                            economy: formatCurrency(lawyerBackend.economy), 
                            conversion: lawyerBackend.conversion_rate || 0, 
                            deals: lawyerBackend.closed_deals || 0
                        },
                        
                        products: { 
                            used: lawyerBackend.products_count || 0, 
                            value: formatCurrency(lawyerBackend.products_proposed_value), 
                            economy: formatCurrency(lawyerBackend.products_economy) 
                        }
                    };

                    return (
                        <LawyerPerformanceCard
                            key={mappedLawyer.id}
                            lawyer={mappedLawyer}
                            rank={index + 1}
                            // Passa a função direto, o Card vai chamar com o argumento certo
                            onViewDetails={onViewDetails} 
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default TeamPerformancePanel;