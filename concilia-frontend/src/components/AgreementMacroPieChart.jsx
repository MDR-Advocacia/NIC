import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const AgreementMacroPieChart = ({
  data,
  emptyMessage = 'Não há acordos fechados suficientes para montar a visão macro.',
}) => {
  const { theme } = useTheme();
  const slices = Array.isArray(data) ? data : [];
  const total = slices.reduce((sum, slice) => sum + Number(slice?.value || 0), 0);

  if (total === 0) {
    return <p>{emptyMessage}</p>;
  }

  const primaryTextColor = theme === 'light' ? '#1f2937' : '#f8fafc';
  const secondaryTextColor = theme === 'light' ? '#64748b' : '#cbd5e1';
  const borderColor = theme === 'light' ? '#ffffff' : '#0f172a';
  const centerTextPlugin = useMemo(
    () => ({
      id: 'agreementMacroCenterText',
      afterDatasetsDraw(chart) {
        const firstArc = chart.getDatasetMeta(0)?.data?.[0];
        if (!firstArc) {
          return;
        }

        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = primaryTextColor;
        ctx.font = '800 30px Segoe UI';
        ctx.fillText(String(total), firstArc.x, firstArc.y - 10);

        ctx.fillStyle = secondaryTextColor;
        ctx.font = '500 13px Segoe UI';
        ctx.fillText('acordos mapeados', firstArc.x, firstArc.y + 22);
        ctx.restore();
      },
    }),
    [primaryTextColor, secondaryTextColor, total]
  );

  const chartData = {
    labels: slices.map((slice) => slice.label),
    datasets: [
      {
        data: slices.map((slice) => Number(slice.value || 0)),
        backgroundColor: slices.map((slice) => slice.color),
        borderColor,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: secondaryTextColor,
          boxWidth: 12,
          padding: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const rawValue = Number(context.raw || 0);
            const percentage = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0.0';
            return `${rawValue} acordo(s) • ${percentage}%`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <Doughnut data={chartData} options={chartOptions} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default AgreementMacroPieChart;
