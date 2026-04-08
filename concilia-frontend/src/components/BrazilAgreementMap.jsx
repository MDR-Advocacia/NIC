import React, { useMemo, useRef, useState } from 'react';
import brazilMapSvg from '../assets/brazil-map.svg?raw';
import { BRAZIL_STATES } from '../constants/brazilStates';
import styles from '../styles/BrazilAgreementMap.module.css';

const sanitizedBrazilMapSvg = brazilMapSvg
  .replace(/<style[\s\S]*?<\/style>/i, '')
  .replace(/<svg\b([^>]*)>/i, '<svg$1 class="dashboardBrazilMapSvg" preserveAspectRatio="xMidYMid meet">');

const getMapColor = (count, maxCount) => {
  if (!count || count <= 0 || maxCount <= 0) {
    return '#ffffff';
  }

  const intensity = Math.min(count / maxCount, 1);
  const start = { r: 220, g: 252, b: 231 };
  const end = { r: 22, g: 101, b: 52 };
  const interpolate = (from, to) => Math.round(from + ((to - from) * intensity));

  return `rgb(${interpolate(start.r, end.r)}, ${interpolate(start.g, end.g)}, ${interpolate(start.b, end.b)})`;
};

const BrazilAgreementMap = ({
  data,
}) => {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const normalizedData = Array.isArray(data) ? data : [];
  const countsByState = useMemo(
    () =>
      Object.fromEntries(
        normalizedData.map((entry) => [String(entry.uf || '').toUpperCase(), Number(entry.count || 0)])
      ),
    [normalizedData]
  );

  const maxCount = Math.max(...normalizedData.map((entry) => Number(entry.count || 0)), 0);
  const statesWithDeals = normalizedData.filter((entry) => Number(entry.count || 0) > 0).length;
  const totalDeals = normalizedData.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
  const coloredBrazilMapSvg = useMemo(() => {
    let svgMarkup = sanitizedBrazilMapSvg;

    BRAZIL_STATES.forEach(({ uf, name }) => {
      const count = countsByState[uf] || 0;
      const fillColor = getMapColor(count, maxCount);
      const tooltipText = `${name}: ${count} acordo${count === 1 ? '' : 's'}`;

      svgMarkup = svgMarkup.replace(
        `id="${uf}"`,
        `id="${uf}" data-state-name="${name}" data-state-count="${count}" style="fill: ${fillColor};" aria-label="${tooltipText}"`
      );
    });

    return svgMarkup;
  }, [countsByState, maxCount]);

  const handleMapMouseMove = (event) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const stateElement = event.target.closest?.('[data-state-name]');
    if (!stateElement || !container.contains(stateElement)) {
      setTooltip(null);
      return;
    }

    const bounds = container.getBoundingClientRect();
    setTooltip({
      name: stateElement.getAttribute('data-state-name') || '',
      count: Number(stateElement.getAttribute('data-state-count') || 0),
      x: event.clientX - bounds.left + 16,
      y: event.clientY - bounds.top + 16,
    });
  };

  return (
    <div className={styles.mapLayout}>
      <div className={styles.mapSummary}>
        <div className={styles.summaryCard}>
          <span>Total</span>
          <strong>{totalDeals}</strong>
          <small>acordos fechados</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Estados ativos</span>
          <strong>{statesWithDeals}</strong>
          <small>com pelo menos 1 acordo</small>
        </div>
      </div>

      <div className={styles.mapFrame}>
        <div
          ref={containerRef}
          className={styles.mapSvgWrapper}
          onMouseMove={handleMapMouseMove}
          onMouseLeave={() => setTooltip(null)}
          dangerouslySetInnerHTML={{ __html: coloredBrazilMapSvg }}
        />
        {tooltip && (
          <div
            className={styles.mapTooltip}
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
            }}
          >
            <strong>{tooltip.name}</strong>
            <span>{tooltip.count} acordo{tooltip.count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      <div className={styles.mapLegend}>
        <span>0</span>
        <div className={styles.legendTrack} />
        <span>{maxCount}</span>
      </div>
    </div>
  );
};

export default BrazilAgreementMap;
