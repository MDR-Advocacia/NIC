import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';

const CaseEditPage = () => {
  const { caseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null); // Inicia como nulo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Efeito para BUSCAR os dados atuais do caso
  useEffect(() => {
    const fetchCase = async () => {
      if (!token || !caseId) return;
      try {
        setLoading(true);
        const response = await apiClient.get(`/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormData(response.data); // Preenche o formulário com os dados da API
      } catch (err) {
        setError('Não foi possível carregar os dados para edição.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId, token]);

  // 2. Função para lidar com a MUDANÇA nos campos do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // 3. Função para lidar com o ENVIO do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Prepara os dados para enviar, garantindo que o client_id seja enviado
      const dataToSubmit = { ...formData, client_id: formData.client.id };

      await apiClient.put(`/cases/${caseId}`, dataToSubmit, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sucesso! Volta para a página de detalhes
      navigate(`/cases/${caseId}`);
    } catch (err) {
      console.error("Erro ao atualizar o caso:", err.response?.data);
      setError('Erro ao atualizar o caso. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Carregando formulário de edição...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // 4. O formulário em si
  return (
    <div>
      <Link to={`/cases/${caseId}`}>{"< Voltar para os Detalhes"}</Link>
      <h1>Editar Caso: {formData.case_number}</h1>
      <form onSubmit={handleSubmit}>
        {/* Exemplo de alguns campos. Outros podem ser adicionados seguindo o mesmo padrão */}
        <div>
          <label htmlFor="opposing_party">Autor (Parte Contrária):</label>
          <input
            type="text"
            id="opposing_party"
            name="opposing_party"
            value={formData.opposing_party || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Descrição:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows="4"
          />
        </div>
        <div>
          <label htmlFor="original_value">Valor da Causa:</label>
          <input
            type="number"
            id="original_value"
            name="original_value"
            value={formData.original_value || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="status">Status:</label>
          <select name="status" id="status" value={formData.status} onChange={handleChange}>
            <option value="initial_analysis">Análise Inicial</option>
            <option value="proposal_sent">Proposta Enviada</option>
            <option value="in_negotiation">Em Negociação</option>
            <option value="awaiting_draft">Aguardando Minuta</option>
            <option value="closed_deal">Acordo Fechado</option>
            <option value="failed_deal">Acordo Frustrado</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
};

export default CaseEditPage;