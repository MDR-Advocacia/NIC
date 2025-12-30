import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ForceChangePassword from '../pages/ForceChangePassword';

const ProtectedRoute = ({ children }) => {
  // Pegamos o user e o loading. 
  // O "authenticated" removemos pois pode não existir no seu contexto.
  const { user, loading } = useAuth();

  // 1. Debug: Vamos ver no console o que está chegando
  console.log("ProtectedRoute - User:", user);
  console.log("ProtectedRoute - Loading:", loading);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        Carregando sistema...
      </div>
    );
  }

  // 2. Verificação de Segurança:
  // Se não tem usuário (user é null ou false), manda pro login.
  if (!user) {
    console.warn("Acesso negado: Usuário não detectado.");
    return <Navigate to="/login" />;
  }

  // 3. Regra de Troca de Senha Obrigatória:
  // Verifica se o user existe E se a flag must_change_password é verdadeira
  if (user && (user.must_change_password === true || user.must_change_password === 1)) {
    console.log("Bloqueio de Segurança: Troca de senha obrigatória.");
    return <ForceChangePassword />;
  }

  // 4. Se passou por tudo, libera o acesso à rota (Dashboard, etc)
  return children;
};

export default ProtectedRoute;