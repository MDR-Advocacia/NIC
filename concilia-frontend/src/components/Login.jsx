import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaHandshake, FaLock, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const mensagem =
        err?.response?.data?.message ||
        err?.response?.data?.email ||
        'Credenciais invalidas. Tente novamente.';

      setError(Array.isArray(mensagem) ? mensagem[0] : mensagem);
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
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

      <p className={styles.subtitle}>Acesse sua conta para continuar</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.inputGroup}>
          <FaEnvelope className={styles.icon} />
          <input
            type="email"
            placeholder="E-mail Corporativo"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <FaLock className={styles.icon} />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div style={{ width: '100%', textAlign: 'right', marginBottom: '15px', marginTop: '-10px' }}>
          <Link
            to="/forgot-password"
            style={{ color: '#4a5568', fontSize: '0.85rem', textDecoration: 'none' }}
            onMouseOver={(event) => {
              event.target.style.textDecoration = 'underline';
            }}
            onMouseOut={(event) => {
              event.target.style.textDecoration = 'none';
            }}
          >
            Esqueci minha senha
          </Link>
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? (
            <>
              <FaSpinner className={styles.spinner} /> Entrando...
            </>
          ) : (
            'Acessar Sistema'
          )}
        </button>
      </form>

      <div className={styles.footer}>
        <p>© {new Date().getFullYear()} MDR Advocacia</p>
      </div>
    </div>
  );
};

export default Login;
