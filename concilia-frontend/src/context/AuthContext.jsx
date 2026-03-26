import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { authApi, clearStoredAuthSession, getStoredAuthToken } from '../api';

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredAuthToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => Boolean(getStoredAuthToken()));

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const currentToken = getStoredAuthToken();

    if (!currentToken) {
      setLoading(false);
      return;
    }

    let active = true;

    const validateSession = async () => {
      try {
        setLoading(true);
        const response = await authApi.me();

        if (!active) return;

        localStorage.setItem('user', JSON.stringify(response.data));
        setToken(currentToken);
        setUser(response.data);
      } catch (error) {
        if (!active) return;

        clearStoredAuthSession();
        setToken(null);
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/login', { email, password });
    const nextToken = String(response.data.token || '').replace(/^"+|"+$/g, '').trim();

    localStorage.setItem('authToken', nextToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    setToken(nextToken);
    setUser(response.data.user);
    setLoading(false);
  };

  const logout = async () => {
    try {
      if (getStoredAuthToken()) {
        await authApi.logout();
      }
    } catch (error) {
      // Mesmo que o backend ja tenha invalidado a sessao, seguimos com a limpeza local.
    } finally {
      clearStoredAuthSession();
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setUser,
      login,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
