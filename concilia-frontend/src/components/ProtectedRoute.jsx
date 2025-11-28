import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Se não houver usuário, redireciona para a página de login
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;