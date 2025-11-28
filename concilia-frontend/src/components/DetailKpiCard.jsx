// src/components/DetailKpiCard.jsx
import React from 'react';
import styles from '../styles/CaseDetail.module.css';

const DetailKpiCard = ({ icon, title, value, color, children }) => {
  // Estilo para o fundo e borda do card, baseado na cor
  const cardStyle = {
    backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`,
    border: `1px solid ${color}`,
  };

  // Estilo para o fundo do ícone
  const iconStyle = {
    backgroundColor: color,
  };

  return (
    <div className={styles.kpiCard} style={cardStyle}>
      <div className={styles.kpiIcon} style={iconStyle}>
        {icon}
      </div>
      <div className={styles.kpiContent}>
        <label>{title}</label>
        <p>{value}</p>
        {children && <div className={styles.kpiExtra}>{children}</div>}
      </div>
    </div>
  );
};

export default DetailKpiCard;