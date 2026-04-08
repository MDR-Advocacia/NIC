import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/ForgotPassword.module.css';

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
            await apiClient.post('/forgot-password', { email: email.trim() });
            setMessage('Link enviado! Verifique seu e-mail.');
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
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Recuperar Senha</h2>
                <p className={styles.subtitle}>Digite seu e-mail corporativo para receber o link de redefinicao.</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <FaEnvelope color="#9CA3AF" />
                        <input
                            type="email"
                            placeholder="exemplo@mdradvocacia.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Link'}
                    </button>
                </form>

                {message && <div className={styles.successMessage}>{message}</div>}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <Link to="/login" className={styles.backLink}>
                    <FaArrowLeft style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                    Voltar para Login
                </Link>
            </div>
        </div>
    );
}
