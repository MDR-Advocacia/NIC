import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import styles from '../styles/MetricInfoHint.module.css';

// placement="bottom" abre a dica para baixo (útil em títulos no topo da página)
const MetricInfoHint = ({ text, className = '', placement = 'top' }) => {
    const classes = [styles.wrapper, placement === 'bottom' ? styles.bottom : '', className].filter(Boolean).join(' ');

    return (
        <span className={classes}>
            <span
                className={styles.trigger}
                tabIndex={0}
                aria-label={text}
                title={text}
            >
                <FaInfoCircle aria-hidden="true" />
            </span>
            <span className={styles.tooltip} role="tooltip">
                {text}
            </span>
        </span>
    );
};

export default MetricInfoHint;
