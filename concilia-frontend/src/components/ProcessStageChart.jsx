// src/components/ProcessStageChart.jsx
// ATUALIZADO: Passa o 'statusKey' E o 'statusName' no clique

import React from 'react';
import styles from '../styles/ProcessStageChart.module.css';

const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B' },
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E' },
};

const ProcessStageChart = ({ data, onStageClick }) => {
    if (!data || Object.keys(data).length === 0) {
        return <p>Não há dados de distribuição para exibir.</p>;
    }

    const totalCases = Object.values(data).reduce((sum, value) => sum + value, 0);

    const chartData = Object.entries(data).map(([key, value]) => ({
        key: key,
        name: STATUS_DETAILS[key]?.name || key.replace('_', ' '),
        count: value,
        percentage: totalCases > 0 ? (value / totalCases) * 100 : 0,
        color: STATUS_DETAILS[key]?.color || '#A0AEC0' 
    }));

    return (
        <div className={styles.container}>
            {chartData.map(item => (
                <div 
                    key={item.name} 
                    className={styles.stageRow}
                    // ATUALIZADO: Passa a key E o name
                    onClick={() => onStageClick(item.key, item.name)}
                >
                    <div className={styles.stageName}>{item.name}</div>
                    <div className={styles.barContainer}>
                        <div 
                            className={styles.barFill} 
                            style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: item.color 
                            }}
                        ></div>
                    </div>
                    <div className={styles.stageData}>
                        <span className={styles.stageCount}>{item.count} casos</span>
                        <span className={styles.stagePercentage}>{item.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProcessStageChart;