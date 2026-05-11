import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api';
import styles from '../styles/UserProfile.module.css';
import { FaComments, FaSave, FaShieldAlt, FaSyncAlt, FaUserCircle } from 'react-icons/fa';

const getChatwootStatusCopy = (status, user) => {
    if (!status) {
        return {
            title: 'Verificando integracao',
            text: 'O NIC esta conferindo se existe uma conta do Chatwoot para este usuario.',
        };
    }

    if (status.connected) {
        return {
            title: status.agent?.name || 'Conta conectada automaticamente',
            text: `${status.agent?.email || user?.email || 'Usuario'} sera usado nas acoes da Caixa de Entrada.`,
        };
    }

    if (status.integration_mode === 'agent_found_without_token') {
        return {
            title: status.agent?.name || 'Agente encontrado',
            text: status.automatic_sync_available
                ? 'O agente foi localizado no Chatwoot. Sincronize novamente para liberar a identidade de atendimento.'
                : 'O agente foi localizado no Chatwoot, mas o backend ainda precisa do token da Platform API para obter a identidade automaticamente.',
        };
    }

    return {
        title: 'Aguardando sincronizacao',
        text: 'O NIC vai vincular automaticamente quando encontrar um agente do Chatwoot com o mesmo e-mail deste usuario.',
    };
};

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
    const [chatwootStatus, setChatwootStatus] = useState(null);
    const [chatwootLoading, setChatwootLoading] = useState(true);
    const [chatwootMsg, setChatwootMsg] = useState({ type: '', text: '' });

    const carregarConexaoChatwoot = async (silent = false) => {
        if (!silent) {
            setChatwootLoading(true);
        }

        try {
            const response = await apiClient.get('/chat/connection');
            setChatwootStatus(response.data);

            if (!silent) {
                setChatwootMsg({
                    type: response.data?.connected ? 'success' : 'info',
                    text: response.data?.connected
                        ? 'Integracao automatica ativa.'
                        : 'Sincronizacao automatica ainda pendente.'
                });
            }
        } catch (error) {
            setChatwootStatus(error.response?.data || null);
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.hint || error.response?.data?.message || 'Nao foi possivel consultar a conexao do Chatwoot.'
            });
        } finally {
            setChatwootLoading(false);
        }
    };

    useEffect(() => {
        carregarConexaoChatwoot(true);
    }, []);

    const handleChange = (e) => {
        setPass({ ...pass, [e.target.name]: e.target.value });
        if (msg.text) setMsg({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pass.new_password.length < 8) {
            setMsg({ type: 'error', text: 'Minimo 8 caracteres.' });
            return;
        }
        if (pass.new_password !== pass.new_password_confirmation) {
            setMsg({ type: 'error', text: 'As senhas nao conferem.' });
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
    const chatwootConnected = Boolean(chatwootStatus?.connected);
    const statusCopy = getChatwootStatusCopy(chatwootStatus, user);

    return (
        <div className={`${styles.pageContainer} ${themeClass}`}>
            <h1 className={styles.title}>Meu Perfil</h1>

            <div className={styles.card}>
                <div className={styles.header}>
                    <FaUserCircle /> Dados da Conta
                </div>
                <div className={styles.grid}>
                    <div className={styles.group}>
                        <label className={styles.label}>Nome</label>
                        <input className={`${styles.input} ${styles.readOnly}`} value={user?.name || ''} disabled />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Email</label>
                        <input className={`${styles.input} ${styles.readOnly}`} value={user?.email || ''} disabled />
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <FaComments /> Chatwoot
                </div>

                {chatwootMsg.text && (
                    <div className={`${styles.message} ${chatwootMsg.type === 'error' ? styles.error : styles.success}`}>
                        {chatwootMsg.text}
                    </div>
                )}

                <div className={styles.connectionPanel}>
                    <div>
                        <span className={`${styles.statusBadge} ${chatwootConnected ? styles.statusOk : styles.statusWarn}`}>
                            {chatwootLoading ? 'Verificando' : chatwootConnected ? 'Conectado' : 'Pendente'}
                        </span>
                        <h2 className={styles.sectionTitle}>{statusCopy.title}</h2>
                        <p className={styles.helperText}>{statusCopy.text}</p>
                    </div>

                    <button type="button" className={styles.iconButton} onClick={() => carregarConexaoChatwoot()} disabled={chatwootLoading} title="Sincronizar Chatwoot">
                        <FaSyncAlt />
                    </button>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <FaShieldAlt /> Seguranca
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
