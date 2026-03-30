// src/components/StatusDistributionChartJS.jsx
// ATUALIZADO: Cores do texto (legenda e centro) agora usam o ThemeContext

import React, { useRef } from 'react';
import { Doughnut, getElementAtEvent } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { useTheme } from '../context/ThemeContext'; // 1. IMPORTA O CÉREBRO DO TEMA
import {
    LEGAL_CASE_STATUS_ORDER,
    getLegalCaseStatusDetails,
} from '../constants/legalCaseStatus';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatusDistributionChartJS = ({ data, onStageClick }) => {
    // 2. USA O TEMA ATIVO
    const { theme } = useTheme();

    // 3. DEFINE AS CORES DO TEXTO BASEADO NO TEMA
    const primaryTextColor = theme === 'light' ? '#212529' : '#e2e8f0';
    const secondaryTextColor = theme === 'light' ? '#6c757d' : '#a0aec0';
    
    // (O restante da lógica de dados permanece)
    const chartDataMap = LEGAL_CASE_STATUS_ORDER.map((key) => ({
        key: key,
        name: getLegalCaseStatusDetails(key).name,
        value: data?.[key] || 0,
        color: getLegalCaseStatusDetails(key).color,
    }));

    const chartData = {
        labels: chartDataMap.map(d => d.name),
        datasets: [
            {
                label: 'Casos',
                data: chartDataMap.map(d => d.value),
                backgroundColor: chartDataMap.map(d => d.color),
                borderColor: theme === 'light' ? '#ffffff' : '#1a202c', // Borda usa o fundo do card
                borderWidth: 2,
                hoverOffset: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        onHover: (event, chartElement) => {
            const chart = event.chart;
            if (chartElement.length > 0) {
                chart.canvas.style.cursor = 'pointer';
            } else {
                chart.canvas.style.cursor = 'default';
            }
        },
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: secondaryTextColor, // 4. APLICA A COR DINÂMICA
                    boxWidth: 12,
                    padding: 20,
                },
            },
            tooltip: { /* ... */ },
        },
    };

    const chartRef = useRef(null);

    const handleChartClick = (event) => {
        const chart = chartRef.current;
        if (!chart) return;
        const element = getElementAtEvent(chart, event);
        if (element.length > 0) {
            const index = element[0].index;
            const clickedItem = chartDataMap[index];
            if (onStageClick) {
                onStageClick(clickedItem.key, clickedItem.name); 
            }
        }
    };

    if (!data || Object.keys(data).length === 0) {
        return <p>Não há dados de distribuição para exibir.</p>;
    }

    const totalCases = chartDataMap.reduce((sum, item) => sum + item.value, 0);

    return (
        <div style={{ position: 'relative', height: '300px' }}>
            <Doughnut 
                ref={chartRef}
                data={chartData} 
                options={chartOptions}
                onClick={handleChartClick}
            />
            {/* 5. APLICA A COR DINÂMICA NO TEXTO CENTRAL */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '35%', 
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: primaryTextColor }}>{totalCases}</span>
                <br />
                <span style={{ fontSize: '0.9rem', color: secondaryTextColor }}>Total de Casos</span>
            </div>
        </div>
    );
};

export default StatusDistributionChartJS;
