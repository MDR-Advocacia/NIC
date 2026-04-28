import React, { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationCircle, FaHandshake, FaLock, FaSignOutAlt, FaSpinner } from 'react-icons/fa';
import api from '../api';
import { getDefaultRouteForRole } from '../constants/access';
import styles from '../styles/PasswordFlow.module.css';

const ForceChangePassword = () => {
  const { logout, user, setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/change-password', formData);
      const updatedUser = { ...user, must_change_password: false };

      localStorage.setItem('user', JSON.stringify(updatedUser));

      if (setUser) {
        setUser(updatedUser);
      }

      setSuccess(response.data?.message || 'Senha alterada com sucesso.');
      setTimeout(() => {
        navigate(getDefaultRouteForRole(updatedUser.role), { replace: true });
      }, 1200);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao alterar senha');
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

        <h2 className={styles.title}>Alteracao obrigatoria</h2>
        <p className={styles.subtitle}>
          Defina uma nova senha para continuar acessando o sistema.
        </p>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <FaCheckCircle />
            <span>{success} Redirecionando...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="current_password">Senha atual ou temporaria</label>
            <div className={styles.inputGroup}>
              <FaLock className={styles.inputIcon} />
              <input
                id="current_password"
                type="password"
                required
                value={formData.current_password}
                onChange={e => setFormData({...formData, current_password: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="new_password">Nova senha</label>
            <div className={styles.inputGroup}>
              <FaLock className={styles.inputIcon} />
              <input
                id="new_password"
                type="password"
                required
                minLength={8}
                value={formData.new_password}
                onChange={e => setFormData({...formData, new_password: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="new_password_confirmation">Confirmar nova senha</label>
            <div className={styles.inputGroup}>
              <FaLock className={styles.inputIcon} />
              <input
                id="new_password_confirmation"
                type="password"
                required
                minLength={8}
                value={formData.new_password_confirmation}
                onChange={e => setFormData({...formData, new_password_confirmation: e.target.value})}
              />
            </div>
          </div>
          
          <button type="submit" className={styles.button} disabled={loading || Boolean(success)}>
            {loading ? <><FaSpinner className={styles.spinner} /> Salvando...</> : 'Definir nova senha'}
          </button>
        </form>
        
        <button type="button" onClick={logout} className={styles.ghostButton}>
          <FaSignOutAlt />
          Sair da conta
        </button>
      </div>
    </div>
  );
};

export default ForceChangePassword;
