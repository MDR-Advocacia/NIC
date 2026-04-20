// src/pages/CaseEditPage.jsx
// VERSÃO DEFINITIVA: Checklist embutido e sanitização forçada de dados

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import { LEGAL_CASE_STATUS_OPTIONS } from '../constants/legalCaseStatus';
import {
    LIVELO_MIN_POINTS,
    getSettlementBenefitType,
    normalizeSettlementBenefitPayload,
    OUROCAP_MIN_VALUE,
    SETTLEMENT_BENEFIT_OPTIONS,
    SETTLEMENT_BENEFIT_TYPES,
    validateSettlementBenefit
} from '../constants/settlementBenefit';

// --- ESTILOS INLINE (Para garantir visual sem depender de CSS externo) ---
const cardStyle = {
    padding: '24px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--border-color-light)',
    boxShadow: 'var(--card-shadow)',
    marginBottom: '20px'
};

const inputStyle = {
    minHeight: '48px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid var(--border-color-dark)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    width: '100%',
    marginTop: '8px',
    boxSizing: 'border-box'
};

const pageShellStyle = {
    maxWidth: '920px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    color: 'var(--text-primary)'
};

const backLinkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    fontWeight: 700
};

const pageTitleStyle = {
    marginTop: 0,
    marginBottom: '4px',
    color: 'var(--text-primary)',
    fontSize: '2rem',
    lineHeight: 1.1
};

const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: '16px',
    color: 'var(--text-primary)',
    fontSize: '1.1rem'
};

const fieldLabelStyle = {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.88rem',
    color: 'var(--text-secondary)'
};

const sectionDividerStyle = {
    display: 'block',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-color-light)',
    color: 'var(--text-primary)'
};

const buttonRowStyle = {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
};

const primaryButtonStyle = {
    minHeight: '48px',
    padding: '0 24px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    flex: 1,
    boxShadow: '0 16px 30px rgba(37, 99, 235, 0.22)'
};

const secondaryButtonStyle = {
    minHeight: '48px',
    padding: '0 24px',
    backgroundColor: '#ffffff',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color-light)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700
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
            <h3 style={{...sectionTitleStyle, display: 'flex', justifyContent: 'space-between'}}>
                Análise de Risco
                <span style={{color: color}}>{probability}%</span>
            </h3>
            
            <div style={{marginBottom: '15px'}}>
                <strong style={sectionDividerStyle}>Critérios Objetivos</strong>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                    {Object.keys(safeData.objective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)'}}>
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
                <strong style={sectionDividerStyle}>Critérios Subjetivos</strong>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                    {Object.keys(safeData.subjective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)'}}>
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
      agreement_closed_at: '',
      ourocap_value: '',
      livelo_points: '',
      status: 'initial_analysis',
      agreement_checklist_data: {}
  });
  const [settlementBenefitType, setSettlementBenefitType] = useState(SETTLEMENT_BENEFIT_TYPES.NONE);
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
            agreement_closed_at: data.agreement_closed_at ? String(data.agreement_closed_at).slice(0, 10) : '',
            ourocap_value: data.ourocap_value || '',
            livelo_points: data.livelo_points || '',
            // Garante objeto para checklist
            agreement_checklist_data: (typeof data.agreement_checklist_data === 'string')
                ? JSON.parse(data.agreement_checklist_data || '{}')
                : (data.agreement_checklist_data || {})
        };

        setFormData(safeData);
        setSettlementBenefitType(getSettlementBenefitType(safeData));
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

  const handleSettlementBenefitTypeChange = (e) => {
    const value = e.target.value;
    setSettlementBenefitType(value);
    setFormData(prev => ({
      ...prev,
      ourocap_value: value === SETTLEMENT_BENEFIT_TYPES.OUROCAP ? prev.ourocap_value : '',
      livelo_points: value === SETTLEMENT_BENEFIT_TYPES.LIVELO ? prev.livelo_points : '',
    }));
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
      const settlementBenefitError = validateSettlementBenefit({
        settlementBenefitType,
        ourocap_value: formData.ourocap_value,
        livelo_points: formData.livelo_points,
      });

      if (settlementBenefitError) {
        setError(settlementBenefitError);
        setLoading(false);
        return;
      }

      const dataToSubmit = { 
        ...formData, 
        client_id: formData.client?.id || formData.client_id,
        agreement_closed_at: formData.agreement_closed_at || null,
        ...normalizeSettlementBenefitPayload({
            settlementBenefitType,
            ourocap_value: formData.ourocap_value,
            livelo_points: formData.livelo_points,
        }),
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

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Carregando dados...</div>;
  if (error) return <div style={{ padding: '20px', color: '#dc2626' }}>{error}</div>;

  return (
    <div style={pageShellStyle}>
      <Link to={`/cases/${caseId}`} style={backLinkStyle}>
        {"< Voltar para Detalhes"}
      </Link>
      
      <h1 style={pageTitleStyle}>
        Editar Caso #{formData.case_number}
      </h1>
      
      <form onSubmit={handleSubmit}>
        {/* DADOS GERAIS */}
        <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Dados Gerais</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <label style={fieldLabelStyle}>Autor (Parte Contrária):</label>
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
                <label style={fieldLabelStyle}>Descrição:</label>
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
                    <label style={fieldLabelStyle}>Valor da Causa (R$):</label>
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
                    <label style={fieldLabelStyle}>Status:</label>
                    <select 
                        name="status" 
                        value={formData.status || ''} 
                        onChange={handleChange}
                        style={inputStyle}
                    >
                        {LEGAL_CASE_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption.value} value={statusOption.value}>{statusOption.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={fieldLabelStyle}>Data do Fechamento do Acordo:</label>
                    <input
                        type="date"
                        name="agreement_closed_at"
                        value={formData.agreement_closed_at || ''}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={fieldLabelStyle}>Benefício Complementar:</label>
                    <select
                        value={settlementBenefitType}
                        onChange={handleSettlementBenefitTypeChange}
                        style={inputStyle}
                    >
                        {SETTLEMENT_BENEFIT_OPTIONS.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                {settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.OUROCAP && (
                    <div>
                        <label style={fieldLabelStyle}>Valor Ourocap (mínimo R$ 500,00):</label>
                        <input
                            type="number"
                            name="ourocap_value"
                            value={formData.ourocap_value || ''}
                            onChange={handleChange}
                            step="0.01"
                            min={OUROCAP_MIN_VALUE}
                            style={inputStyle}
                        />
                    </div>
                )}
                {settlementBenefitType === SETTLEMENT_BENEFIT_TYPES.LIVELO && (
                    <div>
                        <label style={fieldLabelStyle}>Pontos Livelo (mínimo 5.000):</label>
                        <input
                            type="number"
                            name="livelo_points"
                            value={formData.livelo_points || ''}
                            onChange={handleChange}
                            step="1"
                            min={LIVELO_MIN_POINTS}
                            style={inputStyle}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* CHECKLIST EMBUTIDO (Não quebra) */}
        <SafeChecklist 
            data={formData.agreement_checklist_data} 
            onChange={handleChecklistUpdate} 
        />

        {/* BOTÕES */}
        <div style={buttonRowStyle}>
          <button 
            type="submit" 
            disabled={loading}
            style={primaryButtonStyle}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          <button 
            type="button"
            onClick={() => navigate(`/cases/${caseId}`)}
            style={secondaryButtonStyle}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default CaseEditPage;
