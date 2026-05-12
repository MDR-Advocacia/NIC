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
            title: status.agent?.name || 'Conta conectada',
            text: `${status.agent?.email || user?.email || 'Usuario'} sera usado nas acoes da Caixa de Entrada.`,
        };
    }

    if (status.integration_mode === 'agent_found_without_token') {
        return {
            title: status.agent?.name || 'Agente encontrado',
            text: 'O agente foi localizado no Chatwoot, mas o NIC ainda precisa do access token pessoal para enviar mensagens com a identidade correta.',
        };
    }

    return {
        title: 'Conexao manual disponivel',
        text: 'O caminho oficial do Chatwoot e autenticar a API com o access token pessoal do agente. Voce pode conectar esse token abaixo.',
    };
};

const getChatwootManualInstructions = (status) => {
    const instructions = Array.isArray(status?.manual_token_instructions)
        ? status.manual_token_instructions.filter(Boolean)
        : [];

    if (instructions.length > 0) {
        return instructions;
    }

    return [
        'Abra o Chatwoot com a mesma conta usada no NIC.',
        'No perfil do Chatwoot, copie o seu access token pessoal.',
        'Cole esse token abaixo para que as mensagens saiam com a sua identidade.',
    ];
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
    const [chatwootAccessToken, setChatwootAccessToken] = useState('');
    const [chatwootSubmitting, setChatwootSubmitting] = useState(false);
    const [chatwootDisconnecting, setChatwootDisconnecting] = useState(false);
    const [chatwootTokenVisible, setChatwootTokenVisible] = useState(false);

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
                        ? 'Conta do Chatwoot pronta para uso.'
                        : response.data?.hint || 'Conecte seu access token pessoal do Chatwoot para liberar sua identidade de atendimento.'
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

    const handleConnectChatwoot = async (e) => {
        e.preventDefault();

        const normalizedToken = chatwootAccessToken.trim();

        if (!normalizedToken) {
            setChatwootMsg({ type: 'error', text: 'Cole o access token pessoal do Chatwoot antes de continuar.' });
            return;
        }

        setChatwootSubmitting(true);

        try {
            const response = await apiClient.put('/chat/connection', {
                chatwoot_access_token: normalizedToken,
            });

            setChatwootStatus(response.data?.connection || null);
            setChatwootAccessToken('');
            setChatwootTokenVisible(false);
            setChatwootMsg({
                type: 'success',
                text: response.data?.message || 'Conta do Chatwoot conectada com sucesso.',
            });
        } catch (error) {
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.message || 'Nao foi possivel validar o access token informado no Chatwoot.',
            });
        } finally {
            setChatwootSubmitting(false);
        }
    };

    const handleDisconnectChatwoot = async () => {
        setChatwootDisconnecting(true);

        try {
            const response = await apiClient.delete('/chat/connection');
            setChatwootStatus(response.data?.connection || null);
            setChatwootMsg({
                type: 'success',
                text: response.data?.message || 'Conta do Chatwoot desconectada com sucesso.',
            });
        } catch (error) {
            setChatwootMsg({
                type: 'error',
                text: error.response?.data?.message || 'Nao foi possivel desconectar a conta do Chatwoot.',
            });
        } finally {
            setChatwootDisconnecting(false);
        }
    };

    const themeClass = theme === 'dark' ? styles.containerDark : styles.containerLight;
    const chatwootConnected = Boolean(chatwootStatus?.connected);
    const statusCopy = getChatwootStatusCopy(chatwootStatus, user);
    const chatwootInstructions = getChatwootManualInstructions(chatwootStatus);

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
                    <div className={`${styles.message} ${chatwootMsg.type === 'error' ? styles.error : chatwootMsg.type === 'info' ? styles.info : styles.success}`}>
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
                        {chatwootStatus?.hint ? <p className={styles.helperText}>{chatwootStatus.hint}</p> : null}
                    </div>

                    <button type="button" className={styles.iconButton} onClick={() => carregarConexaoChatwoot()} disabled={chatwootLoading} title="Sincronizar Chatwoot">
                        <FaSyncAlt />
                    </button>
                </div>

                <div className={styles.connectionSetup}>
                    <div className={styles.instructionsPanel}>
                        <div className={styles.instructionsTitle}>Como conectar sua identidade</div>
                        <div className={styles.instructionsList}>
                            {chatwootInstructions.map((instruction, index) => (
                                <div key={`${instruction}-${index}`} className={styles.instructionItem}>
                                    <span className={styles.instructionBadge}>{index + 1}</span>
                                    <span>{instruction}</span>
                                </div>
                            ))}
                        </div>
                        {chatwootStatus?.agent?.email ? (
                            <div className={styles.helperCallout}>
                                Agente identificado: <strong>{chatwootStatus.agent.name || chatwootStatus.agent.email}</strong> ({chatwootStatus.agent.email})
                            </div>
                        ) : null}
                    </div>

                    <form className={styles.tokenPanel} onSubmit={handleConnectChatwoot}>
                        <div>
                            <div className={styles.instructionsTitle}>{chatwootStatus?.manual_token_label || 'Access token pessoal do Chatwoot'}</div>
                            <p className={styles.helperText}>
                                Esse e o token oficial usado pela API do Chatwoot para agir em nome do agente logado.
                            </p>
                        </div>

                        <div className={styles.group}>
                            <label className={styles.label}>TOKEN PESSOAL</label>
                            <input
                                type={chatwootTokenVisible ? 'text' : 'password'}
                                className={styles.input}
                                value={chatwootAccessToken}
                                onChange={(event) => setChatwootAccessToken(event.target.value)}
                                placeholder="Cole aqui o access token do Chatwoot"
                                autoComplete="off"
                            />
                        </div>

                        <label className={styles.checkboxRow}>
                            <input
                                type="checkbox"
                                checked={chatwootTokenVisible}
                                onChange={(event) => setChatwootTokenVisible(event.target.checked)}
                            />
                            <span>Mostrar token enquanto digito</span>
                        </label>

                        <div className={styles.buttonRow}>
                            <button type="submit" className={styles.btn} disabled={chatwootSubmitting}>
                                {chatwootSubmitting ? 'Validando...' : 'Conectar Chatwoot'}
                            </button>
                            {chatwootConnected ? (
                                <button type="button" className={`${styles.btn} ${styles.dangerBtn}`} onClick={handleDisconnectChatwoot} disabled={chatwootDisconnecting}>
                                    {chatwootDisconnecting ? 'Desconectando...' : 'Desconectar'}
                                </button>
                            ) : null}
                        </div>
                    </form>
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
