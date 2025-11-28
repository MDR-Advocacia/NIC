// src/components/TeamPerformancePanel.jsx
import React from 'react';
import LawyerPerformanceCard from './LawyerPerformanceCard';
import styles from '../styles/TeamPerformancePanel.module.css';

// Dados Fictícios (Mock Data) para construir o visual
const mockPerformanceData = [
    {
        id: 1,
        name: 'Dr. Carlos Santos',
        isLeader: true,
        score: 98.2,
        ranking: 1,
        performance: { economy: 'R$ 519.700', conversion: '78.3', deals: 23 },
        products: { used: 8, value: 'R$ 68.000', economy: 'R$ 25.500' }
    },
    {
        id: 2,
        name: 'Dra. Ana Costa',
        isLeader: false,
        score: 88.7,
        ranking: 2,
        performance: { economy: 'R$ 453.200', conversion: '72.1', deals: 19 },
        products: { used: 6, value: 'R$ 35.000', economy: 'R$ 20.400' }
    }
];


const TeamPerformancePanel = ({ onOpenModal, onViewDetails }) => {
    const performanceData = mockPerformanceData;

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h4>Top 2 Advogados</h4>
                <a href="#" onClick={onOpenModal} className={styles.viewAllLink}>Ver Todos &gt;</a>
            </div>
            <div className={styles.panelBody}>
                {performanceData.map((lawyer, index) => (
                    <LawyerPerformanceCard
                        key={lawyer.id}
                        lawyer={lawyer}
                        rank={index + 1}
                        onViewDetails={onViewDetails} 
                    />
                ))}
            </div>
        </div>
    );
};

export default TeamPerformancePanel;