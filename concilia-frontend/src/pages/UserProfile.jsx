import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api';
import styles from '../styles/UserProfile.module.css';
import { FaComments, FaPlug, FaSave, FaShieldAlt, FaSyncAlt, FaUnlink, FaUserCircle } from 'react-icons/fa';

const UserProfile = () => {
    const { user, token, setUser } = useAuth();
    const { theme } = useTheme();

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [pass, setPass] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });
    const [chatwootStatus, setChatwootStatus] = useState(null);
    const [chatwootAccessToken, setChatwootAccessToken] = useState('');
    const [chatwootLoading, setChatwootLoading] = useState(true);
    const [chatwootSaving, setChatwootSaving] = useState(false);
    const [chatwootMsg, setChatwootMsg] = useState({ type: '', text: '' });

    const syncUser = (nextUser) => {
        if (!nextUser) return;

        localStorage.setItem('user', JSON.stringify(nextUser));
        setUser?.(nextUser);
    };

    const carregarConexaoChatwoot = async (silent = false) => {
        if (!silent) {
            setChatwootLoading(true);
        }

        try {
            const response = await apiClient.get('/chat/connection');
            setChatwootStatus(response.data);

            if (!silent) {
                setChatwootMsg({ type: '', text: '' });
            }
        } catch (error) {
            setChatwootStatus(null);
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.message || 'Nao foi possivel consultar a conexao do Chatwoot.'
            });
        } finally {
            if (!silent) {
                setChatwootLoading(false);
            }
        }
    };

    useEffect(() => {
        carregarConexaoChatwoot();
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

    const handleChatwootConnect = async (event) => {
        event.preventDefault();

        const trimmedToken = chatwootAccessToken.trim();

        if (!trimmedToken) {
            setChatwootMsg({ type: 'error', text: 'Informe o access token pessoal do Chatwoot.' });
            return;
        }

        setChatwootSaving(true);
        setChatwootMsg({ type: '', text: '' });

        try {
            const response = await apiClient.put('/chat/connection', {
                chatwoot_access_token: trimmedToken,
            });

            setChatwootStatus(response.data.connection);
            syncUser(response.data.user);
            setChatwootAccessToken('');
            setChatwootMsg({ type: 'success', text: response.data.message || 'Conta do Chatwoot conectada.' });
        } catch (error) {
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.message || 'Nao foi possivel conectar a conta do Chatwoot.'
            });
        } finally {
            setChatwootSaving(false);
        }
    };

    const handleChatwootDisconnect = async () => {
        const confirmar = window.confirm('Deseja desconectar sua conta do Chatwoot neste usuario do NIC?');

        if (!confirmar) {
            return;
        }

        setChatwootSaving(true);
        setChatwootMsg({ type: '', text: '' });

        try {
            const response = await apiClient.delete('/chat/connection');

            setChatwootStatus(response.data.connection);
            syncUser(response.data.user);
            setChatwootAccessToken('');
            setChatwootMsg({ type: 'success', text: response.data.message || 'Conta do Chatwoot desconectada.' });
        } catch (error) {
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.message || 'Nao foi possivel desconectar a conta do Chatwoot.'
            });
        } finally {
            setChatwootSaving(false);
        }
    };

    const themeClass = theme === 'dark' ? styles.containerDark : styles.containerLight;
    const agenteChatwoot = chatwootStatus?.agent;
    const chatwootConnected = Boolean(chatwootStatus?.connected);

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
                        <h2 className={styles.sectionTitle}>
                            {chatwootConnected ? agenteChatwoot?.name || 'Conta conectada' : 'Conectar conta pessoal'}
                        </h2>
                        <p className={styles.helperText}>
                            {chatwootConnected
                                ? `${agenteChatwoot?.email || user?.email || 'Usuario'} sera usado nas acoes da Caixa de Entrada.`
                                : 'Use o token da sua conta do Chatwoot com o mesmo e-mail do NIC.'}
                        </p>
                    </div>

                    <button type="button" className={styles.iconButton} onClick={() => carregarConexaoChatwoot()} disabled={chatwootLoading || chatwootSaving} title="Atualizar status">
                        <FaSyncAlt />
                    </button>
                </div>

                <form onSubmit={handleChatwootConnect}>
                    <div className={styles.group}>
                        <label className={styles.label}>Access token pessoal</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={chatwootAccessToken}
                            onChange={(event) => {
                                setChatwootAccessToken(event.target.value);
                                if (chatwootMsg.text) setChatwootMsg({ type: '', text: '' });
                            }}
                            placeholder={chatwootConnected ? 'Informe um novo token para trocar a conta' : 'Cole o token do Chatwoot'}
                            autoComplete="off"
                        />
                    </div>

                    <div className={styles.buttonRow}>
                        <button type="submit" className={styles.btn} disabled={chatwootSaving || chatwootLoading}>
                            <FaPlug /> {chatwootSaving ? 'Validando...' : chatwootConnected ? 'Atualizar Conexao' : 'Conectar Conta'}
                        </button>

                        {chatwootConnected && (
                            <button type="button" className={`${styles.btn} ${styles.dangerBtn}`} onClick={handleChatwootDisconnect} disabled={chatwootSaving || chatwootLoading}>
                                <FaUnlink /> Desconectar
                            </button>
                        )}
                    </div>
                </form>
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
