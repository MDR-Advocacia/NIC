import React, { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ForceChangePassword = () => {
  const { logout, user, setUser } = useAuth(); // Precisa de setUser no AuthContext (veja nota abaixo)
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Envia a requisição para o Backend (Isso já estava funcionando)
      await api.post('/change-password', formData);
      
      // 2. MÁGICA: Atualiza o usuário na memória do navegador e do React
      // Cria um clone do usuário atual, mas forçando o bloqueio para FALSE
      const updatedUser = { ...user, must_change_password: false };
      
      // Salva no LocalStorage (chave 'user' conforme vimos no seu print)
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Atualiza o Contexto do React (Se existir a função setUser)
      if (setUser) {
        setUser(updatedUser);
      }

      // 3. Feedback Visual e Redirecionamento
      alert('Senha alterada com sucesso! Você será redirecionado.');
      
      // Força um recarregamento da página para garantir que o sistema leia os dados novos
      window.location.href = '/dashboard';

    } catch (err) {
      // Se der erro (senha errada, etc), mostra na tela
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '1rem', textAlign: 'center' }}>⚠️ Alteração Obrigatória</h2>
        <p style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
          Por motivos de segurança, você precisa definir uma nova senha antes de continuar.
        </p>

        {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555' }}>Senha Atual (Padrão)</label>
            <input 
              type="password" 
              required
              className="form-control" // Se usar Bootstrap, senão estilize básico
              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.current_password}
              onChange={e => setFormData({...formData, current_password: e.target.value})}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555' }}>Nova Senha</label>
            <input 
              type="password" 
              required
              minLength={8}
              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.new_password}
              onChange={e => setFormData({...formData, new_password: e.target.value})}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555' }}>Confirmar Nova Senha</label>
            <input 
              type="password" 
              required
              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
              value={formData.new_password_confirmation}
              onChange={e => setFormData({...formData, new_password_confirmation: e.target.value})}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Salvando...' : 'Definir Nova Senha'}
          </button>
        </form>
        
        <button onClick={logout} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>
          Sair da conta
        </button>
      </div>
    </div>
  );
};

export default ForceChangePassword;