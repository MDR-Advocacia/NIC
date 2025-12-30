import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api';
import styles from '../styles/UserProfile.module.css';
import { FaUserCircle, FaShieldAlt, FaSave } from 'react-icons/fa';

const UserProfile = () => {
    const { user, token } = useAuth();
    const { theme } = useTheme();
    
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [pass, setPass] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const handleChange = (e) => {
        setPass({ ...pass, [e.target.name]: e.target.value });
        if (msg.text) setMsg({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pass.new_password.length < 8) {
            setMsg({ type: 'error', text: 'Mínimo 8 caracteres.' });
            return;
        }
        if (pass.new_password !== pass.new_password_confirmation) {
            setMsg({ type: 'error', text: 'As senhas não conferem.' });
            return;
        }

        setLoading(true);
        try {
            await apiClient.put('/auth/change-password', pass, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
            setPass({ current_password: '', new_password: '', new_password_confirmation: '' });
        } catch (error) {
            setMsg({ type: 'error', text: error.response?.data?.message || 'Erro ao alterar.' });
        } finally {
            setLoading(false);
        }
    };

    const themeClass = theme === 'dark' ? styles.containerDark : styles.containerLight;

    return (
        <div className={`${styles.pageContainer} ${themeClass}`}>
            <h1 className={styles.title}>Meu Perfil</h1>

            {/* DADOS DO USUÁRIO */}
            <div className={styles.card}>
                <div className={styles.header}>
                    <FaUserCircle /> Dados da Conta
                </div>
                <div className={styles.grid}>
                    <div className={styles.group}>
                        <label className={styles.label}>Nome</label>
                        <input className={`${styles.input} ${styles.readOnly}`} value={user?.name} disabled />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Email</label>
                        <input className={`${styles.input} ${styles.readOnly}`} value={user?.email} disabled />
                    </div>
                </div>
            </div>

            {/* ALTERAR SENHA */}
            <div className={styles.card}>
                <div className={styles.header}>
                    <FaShieldAlt /> Segurança
                </div>

                {msg.text && (
                    <div className={`${styles.message} ${msg.type === 'error' ? styles.error : styles.success}`}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className={styles.group}>
                        <label className={styles.label}>Senha Atual</label>
                        <input 
                            type="password" 
                            name="current_password"
                            className={styles.input} 
                            value={pass.current_password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.group}>
                            <label className={styles.label}>Nova Senha</label>
                            <input 
                                type="password" 
                                name="new_password"
                                className={styles.input}
                                value={pass.new_password}
                                onChange={handleChange}
                                placeholder="Min. 8 caracteres"
                                required
                            />
                        </div>
                        <div className={styles.group}>
                            <label className={styles.label}>Confirmar Nova Senha</label>
                            <input 
                                type="password" 
                                name="new_password_confirmation"
                                className={styles.input}
                                value={pass.new_password_confirmation}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className={styles.btn} disabled={loading}>
                        <FaSave /> {loading ? 'Salvando...' : 'Atualizar Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;