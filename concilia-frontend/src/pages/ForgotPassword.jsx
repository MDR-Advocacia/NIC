import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import styles from '../styles/ForgotPassword.module.css'; // <--- Importando o estilo novo
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa'; // Ícones bonitos

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            // Tenta enviar para a API
            // Mude 8123 para 8000
await axios.post('http://localhost:8000/api/forgot-password', { email });
            setMessage('Link enviado! Verifique seu e-mail.');
        } catch (err) {
            console.error("Erro detalhado:", err); // Para ajudar no debug
            // Se o backend retornar erro 422 (email não encontrado), mostramos a mensagem dele
            if (err.response && err.response.data && err.response.data.email) {
                setError(err.response.data.email);
            } else {
                setError('Erro ao enviar. Verifique se o e-mail está correto e tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Recuperar Senha</h2>
                <p className={styles.subtitle}>Digite seu e-mail corporativo para receber o link de redefinição.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <FaEnvelope color="#9CA3AF" />
                        <input 
                            type="email" 
                            placeholder="exemplo@mdradvocacia.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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