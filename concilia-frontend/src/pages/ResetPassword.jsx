import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    FaArrowLeft,
    FaCheckCircle,
    FaEnvelope,
    FaExclamationCircle,
    FaHandshake,
    FaLock,
    FaSpinner,
} from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/PasswordFlow.module.css';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const { token: tokenFromPath } = useParams();
    const navigate = useNavigate();

    const token = tokenFromPath || searchParams.get('token');
    const emailParam = searchParams.get('email');
    const isFirstAccess = searchParams.get('first_access') === '1';

    const [email, setEmail] = useState(emailParam || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('');
        setError('');
        setLoading(true);

        if (!token) {
            setError('Token de redefinicao invalido ou ausente.');
            setLoading(false);
            return;
        }

        if (password !== passwordConfirmation) {
            setError('As senhas nao conferem.');
            setLoading(false);
            return;
        }

        try {
            const response = await apiClient.post('/reset-password', {
                token,
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
            });

            setSuccess(true);
            setStatus(response.data?.status || 'Senha redefinida com sucesso.');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.email || 'Erro ao resetar senha. O link pode ter expirado.');
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

                {success ? (
                    <div className={styles.successState}>
                        <FaCheckCircle className={styles.successIcon} />
                        <h2 className={styles.title}>{isFirstAccess ? 'Acesso confirmado' : 'Senha redefinida'}</h2>
                        <p className={styles.subtitle}>{status} Voce sera redirecionado para o login.</p>
                        <Link to="/login" className={styles.secondaryButton}>Ir para login</Link>
                    </div>
                ) : (
                    <>
                        <h2 className={styles.title}>{isFirstAccess ? 'Criar senha de acesso' : 'Nova senha'}</h2>
                        <p className={styles.subtitle}>
                            {isFirstAccess
                                ? 'Confirme seu e-mail e defina sua senha para ativar o acesso.'
                                : 'Defina uma nova senha para acessar o sistema.'}
                        </p>

                        {error && (
                            <div className={`${styles.alert} ${styles.alertError}`}>
                                <FaExclamationCircle />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <input type="hidden" value={token || ''} />

                            <div className={styles.field}>
                                <label htmlFor="email">Confirmar e-mail</label>
                                <div className={styles.inputGroup}>
                                    <FaEnvelope className={styles.inputIcon} />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="password">Nova senha</label>
                                <div className={styles.inputGroup}>
                                    <FaLock className={styles.inputIcon} />
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="passwordConfirmation">Confirmar nova senha</label>
                                <div className={styles.inputGroup}>
                                    <FaLock className={styles.inputIcon} />
                                    <input
                                        id="passwordConfirmation"
                                        type="password"
                                        value={passwordConfirmation}
                                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className={styles.button} disabled={loading}>
                                {loading ? <><FaSpinner className={styles.spinner} /> Salvando...</> : 'Redefinir senha'}
                            </button>
                        </form>

                        <Link to="/login" className={styles.ghostButton}>
                            <FaArrowLeft />
                            Voltar para login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
