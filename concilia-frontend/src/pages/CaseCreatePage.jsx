// src/pages/CaseCreatePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CaseCreatePage = () => {
  return (
    <div>
      <Link to="/dashboard">{"< Voltar para o Dashboard"}</Link>
      <h1 style={{ marginTop: '1rem' }}>Criar Novo Caso</h1>
      <p>Em breve, o formulário de criação de caso estará aqui.</p>
    </div>
  );
};

export default CaseCreatePage;