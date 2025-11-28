// src/components/MonthlyEvolutionChart.jsx
// ATUALIZADO: Cores dos eixos (grid e texto) agora usam o ThemeContext

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { useTheme } from '../context/ThemeContext'; // 1. IMPORTA O CÉREBRO DO TEMA

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const MonthlyEvolutionChart = ({ data }) => {
    // 2. USA O TEMA ATIVO
    const { theme } = useTheme();

    // 3. DEFINE AS CORES DINÂMICAS
    const secondaryTextColor = theme === 'light' ? '#6c757d' : '#a0aec0';
    const gridColor = theme === 'light' ? '#dee2e6' : '#2d3748';
    const barColor = '#3b82f6'; // A cor de destaque (azul) é a mesma em ambos os temas

    const chartData = {
        labels: Object.keys(data), 
        datasets: [
            {
                label: 'Casos Fechados por Mês',
                data: Object.values(data), 
                backgroundColor: barColor, // 4. APLICA A COR
                borderRadius: 5,
                barThickness: 30,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: gridColor, // 5. APLICA A COR DINÂMICA
                },
                ticks: {
                    color: secondaryTextColor, // 5. APLICA A COR DINÂMICA
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: secondaryTextColor, // 5. APLICA A COR DINÂMICA
                },
            },
        },
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar options={chartOptions} data={chartData} />
        </div>
    );
};

export default MonthlyEvolutionChart;