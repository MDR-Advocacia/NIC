// src/pages/CaseEditPage.jsx
// VERSÃO DEFINITIVA: Checklist embutido e sanitização forçada de dados

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import { LEGAL_CASE_STATUS_OPTIONS } from '../constants/legalCaseStatus';

// --- ESTILOS INLINE (Para garantir visual sem depender de CSS externo) ---
const cardStyle = {
    padding: '20px', 
    backgroundColor: '#fff', 
    borderRadius: '8px', 
    border: '1px solid #e0e0e0',
    marginBottom: '20px'
};

const inputStyle = {
    padding: '10px', 
    borderRadius: '4px', 
    border: '1px solid #ccc', 
    width: '100%',
    marginTop: '5px'
};

// --- COMPONENTE CHECKLIST EMBUTIDO (SEGURANÇA MÁXIMA) ---
// Este componente não quebra mesmo se receber dados nulos
const SafeChecklist = ({ data = {}, onChange }) => {
    // Garante que as chaves existam
    const safeData = {
        objective: {
            materia: false, obrigacao: false, subsidio: false, litigante_habitual: false,
            analise_risco: false, pcond_portal: false, alcada: false,
            ...(data?.objective || {})
        },
        subjective: {
            analise_subsidio: false, pcond_processual: false,
            ...(data?.subjective || {})
        }
    };

    const handleToggle = (section, key) => {
        const newData = {
            ...safeData,
            [section]: {
                ...safeData[section],
                [key]: !safeData[section][key]
            }
        };
        onChange(newData);
    };

    // Calcula score visualmente
    let score = 0;
    Object.values(safeData.objective).forEach(v => v && (score += 10));
    Object.values(safeData.subjective).forEach(v => v && (score += 15));
    const probability = Math.min(score, 100);
    const color = probability >= 70 ? '#10b981' : (probability >= 40 ? '#f59e0b' : '#ef4444');

    return (
        <div style={{...cardStyle, borderLeft: `5px solid ${color}`}}>
            <h3 style={{marginTop: 0, display: 'flex', justifyContent: 'space-between'}}>
                Análise de Risco
                <span style={{color: color}}>{probability}%</span>
            </h3>
            
            <div style={{marginBottom: '15px'}}>
                <strong style={{display:'block', marginBottom:'10px', borderBottom:'1px solid #eee'}}>Critérios Objetivos</strong>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                    {Object.keys(safeData.objective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
                            <input 
                                type="checkbox" 
                                checked={!!safeData.objective[key]} 
                                onChange={() => handleToggle('objective', key)}
                            />
                            {key.replace(/_/g, ' ')}
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <strong style={{display:'block', marginBottom:'10px', borderBottom:'1px solid #eee'}}>Critérios Subjetivos</strong>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                    {Object.keys(safeData.subjective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
                            <input 
                                type="checkbox" 
                                checked={!!safeData.subjective[key]} 
                                onChange={() => handleToggle('subjective', key)}
                            />
                            {key.replace(/_/g, ' ')}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
const CaseEditPage = () => {
  const { caseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
      // Estado inicial seguro
      case_number: '',
      opposing_party: '',
      description: '',
      cause_value: '',
      status: 'initial_analysis',
      agreement_checklist_data: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca Dados
  useEffect(() => {
    const fetchCase = async () => {
      if (!token || !caseId) return;
      try {
        setLoading(true);
        // IMPORTANTE: Adicionado header de autorização
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await apiClient.get(`/cases/${caseId}`, config);
        
        // Tratamento de envelopamento
        let data = response.data;
        if (data && data.data && !data.id) data = data.data;

        // --- SANITIZAÇÃO DE DADOS (CRÍTICO PARA IMPORTAÇÃO) ---
        const safeData = {
            ...data,
            // Garante string para inputs de texto
            opposing_party: (typeof data.opposing_party === 'object') 
                ? (data.opposing_party.name || data.opposing_party.nome || '') 
                : (data.opposing_party || ''),
            // Garante objeto para checklist
            agreement_checklist_data: (typeof data.agreement_checklist_data === 'string')
                ? JSON.parse(data.agreement_checklist_data || '{}')
                : (data.agreement_checklist_data || {})
        };

        setFormData(safeData);
      } catch (err) {
        console.error("Erro ao carregar:", err);
        setError('Erro ao carregar dados. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistUpdate = (newChecklistData) => {
      setFormData(prev => ({
          ...prev,
          agreement_checklist_data: newChecklistData
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSubmit = { 
        ...formData, 
        client_id: formData.client?.id || formData.client_id 
      };

      await apiClient.put(
          `/cases/${caseId}`, 
          dataToSubmit,
          { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/cases/${caseId}`);
    } catch (err) {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Carregando dados...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <Link to={`/cases/${caseId}`} style={{ textDecoration: 'none', color: '#666', marginBottom: '1rem', display: 'inline-block' }}>
        {"< Voltar para Detalhes"}
      </Link>
      
      <h1 style={{ marginTop: '0', marginBottom: '20px', color: '#333' }}>
        Editar Caso #{formData.case_number}
      </h1>
      
      <form onSubmit={handleSubmit}>
        {/* DADOS GERAIS */}
        <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>Dados Gerais</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}>Autor (Parte Contrária):</label>
                <input
                    type="text"
                    name="opposing_party"
                    value={formData.opposing_party}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}>Descrição:</label>
                <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows="4"
                    style={{...inputStyle, resize: 'vertical'}}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={{ fontWeight: 'bold' }}>Valor da Causa (R$):</label>
                    <input
                        type="number"
                        name="cause_value"
                        value={formData.cause_value || ''}
                        onChange={handleChange}
                        step="0.01"
                        style={inputStyle}
                    />
                </div>
                
                <div>
                    <label style={{ fontWeight: 'bold' }}>Status:</label>
                    <select 
                        name="status" 
                        value={formData.status || ''} 
                        onChange={handleChange}
                        style={{...inputStyle, backgroundColor: '#fff'}}
                    >
                        {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* CHECKLIST EMBUTIDO (Não quebra) */}
        <SafeChecklist 
            data={formData.agreement_checklist_data} 
            onChange={handleChecklistUpdate} 
        />

        {/* BOTÕES */}
        <div style={{ display: 'flex', gap: '15px' }}>
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
