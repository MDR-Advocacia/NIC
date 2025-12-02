import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import AgreementChecklist from '../components/AgreementChecklist';
import styles from '../styles/Form.module.css'; // Opcional: Ajuste se não usar CSS Modules

const CaseCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);

  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    case_number: '',
    client_id: '',
    opposing_party: '',
    description: '',
    cause_value: '',
    status: 'initial_analysis',
    priority: 'media',
    // Campos do checklist iniciam nulos ou zerados
    agreement_checklist_data: null,
    agreement_probability: 0
  });

  // Carrega a lista de clientes para o Select
  useEffect(() => {
    const fetchClients = async () => {
        try {
            const res = await apiClient.get('/clients');
            setClients(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, client_id: res.data[0].id }));
            }
        } catch (e) {
            console.error("Erro ao carregar clientes", e);
        }
    };
    fetchClients();
  }, []);

  // Atualiza campos de texto normais
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- CONECTA O CHECKLIST AO FORMULÁRIO ---
  const handleChecklistChange = (checklistData) => {
    setFormData(prev => ({
        ...prev,
        // Mescla os dados do checklist e a probabilidade calculada
        ...checklistData 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Envia o JSON completo (incluindo o checklist) para criar o caso
      const res = await apiClient.post('/cases', formData);
      // Redireciona para o detalhe do caso recém-criado
      navigate(`/cases/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError('Erro ao criar caso. Verifique os dados obrigatórios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link to="/dashboard" style={{ textDecoration: 'none', color: '#666' }}>{"< Voltar para o Dashboard"}</Link>
      
      <h1 style={{ marginTop: '1rem', marginBottom: '20px' }}>Criar Novo Caso</h1>

      {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* --- DADOS BÁSICOS --- */}
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Número do Processo:</label>
                    <input 
                        type="text" name="case_number" required 
                        value={formData.case_number} onChange={handleChange}
                        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Cliente (Empresa):</label>
                    <select 
                        name="client_id" required 
                        value={formData.client_id} onChange={handleChange}
                        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
                    >
                        <option value="">Selecione um cliente...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Parte Contrária (Autor):</label>
                <input 
                    type="text" name="opposing_party" required 
                    value={formData.opposing_party} onChange={handleChange}
                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Descrição:</label>
                <textarea 
                    name="description" rows="3"
                    value={formData.description} onChange={handleChange}
                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Valor da Causa (R$):</label>
                    <input 
                        type="number" name="cause_value" step="0.01"
                        value={formData.cause_value} onChange={handleChange}
                        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Prioridade:</label>
                    <select 
                        name="priority" value={formData.priority} onChange={handleChange}
                        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
                    >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Status Inicial:</label>
                    <select 
                        name="status" value={formData.status} onChange={handleChange}
                        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
                    >
                        <option value="initial_analysis">Análise Inicial</option>
                        <option value="in_negotiation">Em Negociação</option>
                        <option value="proposal_sent">Proposta Enviada</option>
                    </select>
                </div>
            </div>
        </div>

        {/* --- SEÇÃO DO CHECKLIST (ADICIONADA) --- */}
        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Análise Inicial de Acordo</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                Preencha os critérios abaixo para definir a probabilidade inicial de sucesso.
            </p>
            
            <AgreementChecklist 
                checklistData={formData.agreement_checklist_data} 
                onUpdate={handleChecklistChange} 
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            style={{
                marginTop: '10px', backgroundColor: '#28a745', color: 'white', 
                padding: '12px', border: 'none', borderRadius: '6px', 
                fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
            }}
        >
            {loading ? 'Criando Caso...' : 'Cadastrar Novo Caso'}
        </button>

      </form>
    </div>
  );
};

export default CaseCreatePage;