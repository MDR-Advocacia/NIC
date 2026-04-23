import React, { useMemo, useState } from 'react';
import MetricInfoHint from './MetricInfoHint';
import styles from '../styles/TopIndicatorsPanel.module.css';
import { AGREEMENT_COUNT_INFO_TEXT } from '../constants/dashboardMetrics';

const formatPercent = (value) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const TopIndicatorsPanel = ({
  data,
  emptyMessage = 'Nenhum indicador apareceu nos acordos filtrados.',
}) => {
  const [sortMode, setSortMode] = useState('top');
  const leaderboard = useMemo(() => {
    const sourceData = Array.isArray(data) ? [...data] : [];
    const compareIndicators = (firstIndicator, secondIndicator) => {
      const firstClosedDeals = Number(firstIndicator.closed_deals || 0);
      const secondClosedDeals = Number(secondIndicator.closed_deals || 0);
      const firstConversionRate = Number(firstIndicator.conversion_rate || 0);
      const secondConversionRate = Number(secondIndicator.conversion_rate || 0);
      const firstIndications = Number(firstIndicator.indications_count || 0);
      const secondIndications = Number(secondIndicator.indications_count || 0);

      if (sortMode === 'bottom') {
        return (
          firstClosedDeals - secondClosedDeals ||
          firstConversionRate - secondConversionRate ||
          firstIndications - secondIndications ||
          String(firstIndicator.name || '').localeCompare(String(secondIndicator.name || ''), 'pt-BR')
        );
      }

      return (
        secondClosedDeals - firstClosedDeals ||
        secondConversionRate - firstConversionRate ||
        secondIndications - firstIndications ||
        String(firstIndicator.name || '').localeCompare(String(secondIndicator.name || ''), 'pt-BR')
      );
    };

    return sourceData.sort(compareIndicators).slice(0, 3);
  }, [data, sortMode]);
  const maxClosedDeals = Math.max(...leaderboard.map((indicator) => Number(indicator.closed_deals || 0)), 0);

  if (leaderboard.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.modeButton} ${sortMode === 'top' ? styles.modeButtonActive : ''}`}
          onClick={() => setSortMode('top')}
        >
          Mais converteu
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${sortMode === 'bottom' ? styles.modeButtonActive : ''}`}
          onClick={() => setSortMode('bottom')}
        >
          Menos converteu
        </button>
      </div>

      <div className={styles.list}>
        {leaderboard.map((indicator, index) => {
          const closedDeals = Number(indicator.closed_deals || 0);
          const barWidth = maxClosedDeals > 0 ? Math.max((closedDeals / maxClosedDeals) * 100, 8) : 8;

          return (
            <article key={`${indicator.id}-${indicator.name}`} className={styles.item}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.content}>
                <div className={styles.header}>
                  <strong>{indicator.name}</strong>
                  <span>{formatPercent(indicator.conversion_rate)}%</span>
                </div>

                <div className={styles.metrics}>
                  <span>{indicator.indications_count} indicações</span>
                  <span className={styles.metricWithInfo}>
                    <span>{closedDeals} acordos fechados</span>
                    <MetricInfoHint text={AGREEMENT_COUNT_INFO_TEXT} />
                  </span>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default TopIndicatorsPanel;
