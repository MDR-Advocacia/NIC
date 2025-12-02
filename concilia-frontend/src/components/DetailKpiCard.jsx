import React from 'react';
import styles from '../styles/DetailKpiCard.module.css';

const DetailKpiCard = ({ title, value, subtext }) => {
    // BLINDAGEM: Converte o valor para string antes de analisar
    // Se for null ou undefined, vira vazio. Se for número (8), vira texto ("8").
    const safeValue = (value !== undefined && value !== null) ? String(value) : '';

    // Verifica se é positivo/negativo apenas se for uma string válida
    // Isso evita o erro do .slice()
    const isPositive = safeValue.includes && safeValue.includes('+');
    const isNegative = safeValue.includes && safeValue.includes('-');

    return (
        <div className={styles.card}>
            <span className={styles.title}>{title}</span>
            <div className={styles.valueContainer}>
                <h3 className={`${styles.value} ${isPositive ? styles.positive : ''} ${isNegative ? styles.negative : ''}`}>
                    {safeValue}
                </h3>
            </div>
            {subtext && <span className={styles.subtext}>{subtext}</span>}
        </div>
    );
};

export default DetailKpiCard;