// src/pages/LoginPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Login from '../components/Login';
import styles from '../styles/Login.module.css'; // Importe os novos estilos

const LoginPage = () => {
  return (
    // Aplica a classe que centraliza tudo na tela
    <div className={styles.loginPage}>
      <Login />
    </div>
  );
};

export default LoginPage;