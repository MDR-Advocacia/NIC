import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatusDistributionChartJS = ({ data, onStageClick }) => {
    
    const totalCases = useMemo(() => {
        if (!data) return 0;
        return Object.values(data).reduce((acc, curr) => acc + curr, 0);
    }, [data]);

    const labels = [
        'Análise Inicial', 'Indicações', 'Proposta Enviada', 'Em Negociação',
        'Aguardando Minuta', 'Acordo Fechado', 'Acordo Frustrado'
    ];
    
    const colors = [
        '#64748b', '#805AD5', '#3b82f6', '#eab308',
        '#f97316', '#22c55e', '#ef4444'
    ];

    const dataValues = [
        data?.initial_analysis || 0,
        data?.indications || 0,
        data?.proposal_sent || 0,
        data?.in_negotiation || 0,
        data?.awaiting_draft || 0,
        data?.closed_deal || 0,
        data?.failed_deal || 0,
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: colors,
            borderWidth: 0,
            cutout: '75%', 
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 0 },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        onClick: (event, elements) => {
            if (!elements.length) return;
            const index = elements[0].index;
            const keys = ['initial_analysis', 'indications', 'proposal_sent', 'in_negotiation', 'awaiting_draft', 'closed_deal', 'failed_deal'];
            if (onStageClick) onStageClick(keys[index], labels[index]);
        },
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', width: '100%' }}>
            
            {/* CONTAINER DO GRÁFICO */}
            <div style={{ 
                position: 'relative', 
                width: '220px', 
                height: '220px', 
                flexShrink: 0 
            }}>
                <Doughnut data={chartData} options={options} />
                
                {/* TEXTO CENTRAL - APLICANDO O SEU AJUSTE DE 40% */}
                <div style={{ 
                    position: 'absolute',
                    top: '50%',
                    
                    // AQUI ESTÁ O AJUSTE QUE VOCÊ PEDIU:
                    left: '40%', // <--- Mudado de 50% para 40% conforme seu teste
                    
                    transform: 'translate(-50%, -50%)', // Centraliza baseado no ponto definido acima
                    textAlign: 'center',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', lineHeight: '1' }}>
                        {totalCases}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        Total de Casos
                    </span>
                </div>
            </div>

            {/* LEGENDA */}
            <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {labels.map((label, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                            width: '10px', 
                            height: '10px', 
                            backgroundColor: colors[index], 
                            borderRadius: '50%', 
                            marginRight: '8px',
                            flexShrink: 0
                        }} />
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusDistributionChartJS;
