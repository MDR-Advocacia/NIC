import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import styles from '../styles/MetricInfoHint.module.css';

const MetricInfoHint = ({ text, className = '' }) => {
    const classes = className ? `${styles.wrapper} ${className}` : styles.wrapper;

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
