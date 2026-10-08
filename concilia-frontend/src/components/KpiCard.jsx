// src/components/KpiCard.jsx
// Número animado com NumberFlow (mesmo componente dos números do Flow)

import React, { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import styles from '../styles/Dashboard.module.css';
import MetricInfoHint from './MetricInfoHint';

// Função auxiliar para extrair o número e os prefixos/sufixos do texto
const parseValue = (valueString) => {
    if (typeof valueString !== 'string') {
        // Se já for um número (como 50), apenas retorna
        return { prefix: '', endValue: valueString, suffix: '', decimals: 0 };
    }

    // Remove "R$ " e espaços
    let cleanValue = valueString.replace('R$ ', '').trim();
    
    let prefix = '';
    if (valueString.startsWith('R$')) {
        prefix = 'R$ ';
    }
    
    let suffix = '';
    if (valueString.endsWith('%')) {
        suffix = '%';
        cleanValue = cleanValue.replace('%', '');
    }

    // Suporta tanto "1.000,00" quanto "20.5" sem inflar valores percentuais.
    cleanValue = cleanValue.replace(/\s/g, '');
    if (cleanValue.includes(',')) {
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else {
        cleanValue = cleanValue.replace(/[^\d.-]/g, '');
    }

    const endValue = parseFloat(cleanValue);
    
    // Verifica se tem casas decimais
    const decimals = (endValue % 1 !== 0) ? 2 : 0;

    if (isNaN(endValue)) {
        // Se não for um número (ex: "N/A"), apenas retorna o texto
        return { prefix: '', endValue: 0, suffix: valueString, decimals: 0, isNaN: true };
    }

    return { prefix, endValue, suffix, decimals };
};


const KpiCard = ({ title, value, description, infoTooltip }) => {
    // Analisa o valor para extrair as partes
    const { prefix, endValue, suffix, decimals, isNaN } = parseValue(value);

    // Começa do zero e anima até o valor na montagem, como o contador anterior
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setDisplayValue(isNaN ? 0 : endValue));
        return () => cancelAnimationFrame(frame);
    }, [endValue, isNaN]);

    return (
        <div className={styles.kpiCard}>
            <div className={styles.kpiTitleRow}>
                <h3 className={styles.kpiTitle}>{title}</h3>
                {infoTooltip && <MetricInfoHint text={infoTooltip} />}
            </div>
            
            {/* Se o valor não for um número (ex.: "N/A"), mostra o texto original */}
            <p className={styles.kpiValue}>
                {isNaN ? (
                    value 
                ) : (
                    <NumberFlow
                        value={displayValue}
                        locales="pt-BR"
                        prefix={prefix || undefined}
                        suffix={suffix || undefined}
                        format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
                        transformTiming={{ duration: 900, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}
                        spinTiming={{ duration: 900, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}
                    />
                )}
            </p>
            
            {description && <p className={styles.kpiDescription}>{description}</p>}
        </div>
    );
};

export default KpiCard;
