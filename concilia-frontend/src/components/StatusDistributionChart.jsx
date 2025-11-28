// src/components/StatusDistributionChart.jsx
// ATUALIZADO: Gráfico de pizza agora é clicável

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B' },
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E' },
};

// ATUALIZADO: Aceita a nova propriedade 'onStageClick'
const StatusDistributionChart = ({ data, onStageClick }) => {
    
    const chartData = Object.keys(data).map(key => ({
        key: key, // ADICIONADO: Guarda a chave original (ex: 'proposal_sent')
        name: STATUS_DETAILS[key]?.name || key,
        value: data[key],
        color: STATUS_DETAILS[key]?.color || '#A0AEC0',
    }));

    if (!chartData || chartData.length === 0) {
        return <p>Não há dados de distribuição para exibir.</p>;
    }

    // ATUALIZADO: Função de clique que chama o 'onStageClick'
    const handlePieClick = (data) => {
        if (onStageClick && data.key) {
            onStageClick(data.key);
        }
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#2d3748',
                        borderColor: '#4a5568',
                    }}
                />
                <Legend />
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    // ATUALIZADO: Adiciona o cursor de clique e a função onClick
                    cursor="pointer"
                    onClick={handlePieClick}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

export default StatusDistributionChart;