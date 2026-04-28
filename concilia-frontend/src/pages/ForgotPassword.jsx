import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaEnvelope, FaExclamationCircle, FaHandshake, FaSpinner } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/PasswordFlow.module.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post('/forgot-password', { email: email.trim() });
            setMessage(response.data?.status || 'Link enviado. Verifique seu e-mail.');
        } catch (err) {
            console.error('Erro detalhado:', err);

            if (err.response?.data?.email) {
                setError(err.response.data.email);
            } else {
                setError('Erro ao enviar. Verifique se o e-mail esta correto e tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.brandWrapper}>
                    <FaHandshake className={styles.mainIcon} />
                    <div className={styles.textGroup}>
                        <h1 className={styles.nicTitle}>NIC</h1>
                        <div className={styles.meaningBox}>
                            <span>NUCLEO</span>
                            <span>INTEGRADO DE</span>
                            <span>CONCILIACOES</span>
                        </div>
                    </div>
                </div>

                <h2 className={styles.title}>Recuperar senha</h2>
                <p className={styles.subtitle}>Digite seu e-mail corporativo para receber o link de redefinicao.</p>

                {message && (
                    <div className={`${styles.alert} ${styles.alertSuccess}`}>
                        <FaCheckCircle />
                        <span>{message}</span>
                    </div>
                )}

                {error && (
                    <div className={`${styles.alert} ${styles.alertError}`}>
                        <FaExclamationCircle />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="email">E-mail</label>
                        <div className={styles.inputGroup}>
                            <FaEnvelope className={styles.inputIcon} />
                            <input
                                id="email"
                                type="email"
                                placeholder="exemplo@mdradvocacia.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? <><FaSpinner className={styles.spinner} /> Enviando...</> : 'Enviar link'}
                    </button>
                </form>

                <Link to="/login" className={styles.ghostButton}>
                    <FaArrowLeft />
                    Voltar para login
                </Link>
            </div>
        </div>
    );
}
