import React, { createContext, useState, useContext } from 'react';
import apiClient from '../api';

// 1. Cria o Contexto
const AuthContext = createContext(null);

// 2. Cria o Provedor do Contexto
export const AuthProvider = ({ children }) => {
  // Tenta pegar o user e token do localStorage para manter o login
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Função de Login
  const login = async (email, password) => {
    const response = await apiClient.post('/login', {
      email,
      password,
    });

    // Salva o token e o usuário no estado e no localStorage
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setToken(response.data.token);
    setUser(response.data.user);
  };

  // Função de Logout
  const logout = () => {
    // Limpa o localStorage e o estado
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Disponibiliza os valores para os componentes filhos
  const value = {
    user,
    token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Cria um Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  return useContext(AuthContext);
};