import React from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../styles/ConfirmModal.module.css';

const ConfirmModal = ({ open, icon, title, message, confirmLabel, cancelLabel, confirmColor, onConfirm, onCancel }) => {
    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onCancel}><FaTimes /></button>
                {icon && <div className={styles.icon}>{icon}</div>}
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>{cancelLabel || 'Cancelar'}</button>
                    <button
                        className={styles.confirmBtn}
                        style={confirmColor ? { background: confirmColor } : undefined}
                        onClick={onConfirm}
                    >
                        {confirmLabel || 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
