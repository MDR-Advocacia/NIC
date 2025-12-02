import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Importante para o efeito de área sombreada
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MonthlyEvolutionChart = ({ data }) => {
  // Se não houver dados, usa arrays vazios para não quebrar
  const labels = data?.labels || ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const createdData = data?.created || [0,0,0,0,0,0,0,0,0,0,0,0];
  const closedData = data?.closed || [0,0,0,0,0,0,0,0,0,0,0,0];

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Casos Criados',
        data: createdData,
        borderColor: '#3b82f6', // Azul
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4, // Curva suave
        fill: true,
      },
      {
        label: 'Acordos Fechados',
        data: closedData,
        borderColor: '#22c55e', // Verde
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1' } // Cor do texto da legenda
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' } // Linhas de grade mais sutis
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false } // Remove grade vertical
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MonthlyEvolutionChart;