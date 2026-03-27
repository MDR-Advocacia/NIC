import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

const AgreementVolumeChart = ({
  data,
  datasetLabel,
  color = '#22c55e',
  emptyMessage = 'Não há dados de acordos para exibir.',
}) => {
  const labels = data?.labels || [];
  const values = data?.values || [];

  if (labels.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data: values,
        backgroundColor: color,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 32,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw || 0} acordo(s)`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', precision: 0 },
        grid: { color: '#334155' },
      },
      x: {
        ticks: {
          color: '#94a3b8',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: labels.length > 12 ? 10 : 12,
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default AgreementVolumeChart;
