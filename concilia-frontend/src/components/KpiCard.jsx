// src/components/KpiCard.jsx
// ATUALIZADO com a animação CountUp

import React from 'react';
import CountUp from 'react-countup'; // Importando a biblioteca
import styles from '../styles/Dashboard.module.css';

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

    // Converte o formato "1.000,00" para "1000.00" (formato que o JS entende)
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');

    const endValue = parseFloat(cleanValue);
    
    // Verifica se tem casas decimais
    const decimals = (endValue % 1 !== 0) ? 2 : 0;

    if (isNaN(endValue)) {
        // Se não for um número (ex: "N/A"), apenas retorna o texto
        return { prefix: '', endValue: 0, suffix: valueString, decimals: 0, isNaN: true };
    }

    return { prefix, endValue, suffix, decimals };
};


const KpiCard = ({ title, value, description }) => {
    // Analisa o valor para extrair as partes
    const { prefix, endValue, suffix, decimals, isNaN } = parseValue(value);

    return (
        <div className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>{title}</h3>
            
            {/* Usamos o CountUp aqui.
              Se o valor não for um número (isNaN), ele apenas mostra o texto original.
            */}
            <p className={styles.kpiValue}>
                {isNaN ? (
                    value 
                ) : (
                    <CountUp
                        start={0}
                        end={endValue}
                        duration={1.5} // Duração da animação em segundos
                        prefix={prefix}
                        suffix={suffix}
                        decimals={decimals}
                        decimal=","
                        separator="."
                    />
                )}
            </p>
            
            {description && <p className={styles.kpiDescription}>{description}</p>}
        </div>
    );
};

export default KpiCard;