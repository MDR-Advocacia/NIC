// src/components/Login.jsx
// ATUALIZADO: Adicionado ícone <FaHandshake /> e spinner de loading

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Login.module.css';
// 1. IMPORTA OS ÍCONES
import { FaHandshake } from 'react-icons/fa';
import { ImSpinner2 } from 'react-icons/im'; // (Um ícone de spinner legal)

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/dashboard'); 
        } catch (err) {
            setError(err.response?.data?.message || 'Credenciais inválidas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginBox}>
            {/* 2. TÍTULO ATUALIZADO (igual ao menu) */}
            <h1 className={styles.title}><FaHandshake /> <span>Concil.IA</span></h1>
            
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="email">Email:</label>
                    <input
                        id="email"
                        className={styles.input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="password">Senha:</label>
                    <input
                        id="password"
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                
                {/* 3. BOTÃO ATUALIZADO (com ícone e spinner) */}
                <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? (
                        <ImSpinner2 className={styles.spinner} />
                    ) : (
                        <>
                            <FaHandshake /> <span>Entrar</span>
                        </>
                    )}
                </button>
                
                {error && <p className={styles.error}>{error}</p>}
            </form>
        </div>
    );
};

export default Login;