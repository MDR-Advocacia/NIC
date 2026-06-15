import React from 'react';
import { useToastState } from '../context/ToastContext';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import styles from '../styles/Toast.module.css';

const ICON_MAP = {
    success: FaCheckCircle,
    error: FaTimesCircle,
    warning: FaExclamationTriangle,
    info: FaInfoCircle,
};

const ToastContainer = () => {
    const { toasts, removeToast } = useToastState();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map((t) => {
                const Icon = ICON_MAP[t.type] || FaInfoCircle;
                return (
                    <div
                        key={t.id}
                        className={`${styles.toast} ${styles[t.type]}`}
                        role="alert"
                    >
                        <Icon className={styles.icon} />
                        <span className={styles.message}>{t.message}</span>
                        <button
                            className={styles.close}
                            onClick={() => removeToast(t.id)}
                            aria-label="Fechar"
                        >
                            <FaTimes />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
