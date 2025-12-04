import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import AgreementChecklist from '../components/AgreementChecklist';
import styles from '../styles/Form.module.css'; // Usa estilos globais de formulário se houver

const CaseEditPage = () => {
  const { caseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Função para capturar as mudanças vindas do componente Checklist
  const handleChecklistChange = (checklistData) => {
    setFormData(prev => ({
      ...prev,
      // Mescla os dados recebidos (checklist detalhado + probabilidade calculada)
      ...checklistData 
    }));
  };

  // 2. Busca os dados iniciais do caso ao carregar a página
  useEffect(() => {
    const fetchCase = async () => {
      if (!token || !caseId) return;
      try {
        setLoading(true);
        const response = await apiClient.get(`/cases/${caseId}`);
        setFormData(response.data);
      } catch (err) {
        console.error("Erro ao buscar caso:", err);
        setError('Não foi possível carregar os dados para edição.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId, token]);

  // 3. Captura mudanças nos campos de texto padrão (inputs, selects)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // 4. Envia as alterações para a API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Prepara o objeto para envio. 
      // Garante que se 'client' for um objeto (vindo do GET), pegamos apenas o ID.
      const dataToSubmit = { 
        ...formData, 
        client_id: formData.client?.id || formData.client_id 
      };

      await apiClient.put(`/cases/${caseId}`, dataToSubmit);
      
      // Redireciona de volta para a tela de detalhes após salvar
      navigate(`/cases/${caseId}`);
    } catch (err) {
      console.error("Erro ao atualizar o caso:", err.response?.data || err);
      setError('Erro ao atualizar o caso. Verifique os campos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Carregando dados do caso...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  if (!formData) return <div style={{ padding: '20px' }}>Caso não encontrado.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link to={`/cases/${caseId}`} style={{ textDecoration: 'none', color: '#666', marginBottom: '1rem', display: 'inline-block' }}>
        {"< Voltar para Detalhes"}
      </Link>
      
      <h1 style={{ marginTop: '0', marginBottom: '20px', color: '#333' }}>
        Editar Caso #{formData.case_number}
      </h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* --- DADOS GERAIS --- */}
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>Dados Gerais</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Autor (Parte Contrária):</label>
                  <input
                    type="text"
                    name="opposing_party"
                    value={formData.opposing_party || ''}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Descrição do Processo:</label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows="4"
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Valor da Causa (R$):</label>
                        <input
                            type="number"
                            name="cause_value"
                            value={formData.cause_value || ''}
                            onChange={handleChange}
                            step="0.01"
                            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Status:</label>
                        <select 
                            name="status" 
                            value={formData.status} 
                            onChange={handleChange}
                            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
                        >
                            <option value="initial_analysis">Análise Inicial</option>
                            <option value="proposal_sent">Proposta Enviada</option>
                            <option value="in_negotiation">Em Negociação</option>
                            <option value="awaiting_draft">Aguardando Minuta</option>
                            <option value="closed_deal">Acordo Fechado</option>
                            <option value="failed_deal">Acordo Frustrado</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SEÇÃO DO CHECKLIST --- */}
        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Análise de Acordo</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                Atualize os critérios abaixo para recalcular a probabilidade de sucesso deste caso.
            </p>
            
            <AgreementChecklist 
                checklistData={formData.agreement_checklist_data} 
                onUpdate={handleChecklistChange} 
            />
        </div>

        {/* --- BOTÕES DE AÇÃO --- */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{
                backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', 
                border: 'none', borderRadius: '6px', cursor: 'pointer', 
                fontSize: '16px', fontWeight: 'bold', flex: 1
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          <button 
            type="button"
            onClick={() => navigate(`/cases/${caseId}`)}
            style={{
                backgroundColor: '#ef4444', color: 'white', padding: '12px 24px', 
                border: 'none', borderRadius: '6px', cursor: 'pointer', 
                fontSize: '16px', fontWeight: 'bold'
            }}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  );
};

export default CaseEditPage;