import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Login.module.css'; // O CSS que vamos mudar a seguir
import { FaEnvelope, FaLock, FaHandshake, FaSpinner } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciais inválidas. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      
      {/* --- NOVA MARCA NIC (Igual ao Menu Lateral) --- */}
      <div className={styles.brandWrapper}>
        <FaHandshake className={styles.mainIcon} />
        
        <div className={styles.textGroup}>
            <h1 className={styles.nicTitle}>NIC</h1>
            <div className={styles.meaningBox}>
                <span>NÚCLEO</span>
                <span>INTEGRADO DE</span>
                <span>CONCILIAÇÕES</span>
            </div>
        </div>
      </div>
      {/* ---------------------------------------------- */}

      <p className={styles.subtitle}>Acesse sua conta para continuar</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.inputGroup}>
          <FaEnvelope className={styles.icon} />
          <input
            type="email"
            placeholder="E-mail Corporativo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <FaLock className={styles.icon} />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
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