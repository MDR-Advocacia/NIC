import React, { useState, useEffect } from 'react';
import styles from '../styles/AgreementChecklist.module.css';

// Estrutura segura constante
const SAFE_STRUCTURE = {
    objective: {
        materia: false, obrigacao: false, subsidio: false, litigante_habitual: false,
        analise_risco: false, pcond_portal: false, alcada: false
    },
    subjective: {
        analise_subsidio: false, pcond_processual: false
    },
    metadata: { analise_risco_data: '' }
};

const AgreementChecklist = ({ checklistData, onUpdate, readOnly = false }) => {
    
    // 1. Inicializa o estado APENAS UMA VEZ com os dados recebidos ou o padrão
    const [data, setData] = useState(() => {
        if (!checklistData || typeof checklistData !== 'object') return SAFE_STRUCTURE;
        return {
            objective: { ...SAFE_STRUCTURE.objective, ...(checklistData.objective || {}) },
            subjective: { ...SAFE_STRUCTURE.subjective, ...(checklistData.subjective || {}) },
            metadata: { ...SAFE_STRUCTURE.metadata, ...(checklistData.metadata || {}) }
        };
    });

    const [probability, setProbability] = useState(0);

    // 2. Calcula a probabilidade baseada no estado LOCAL (sem dependências externas)
    useEffect(() => {
        let score = 0;
        if (data.objective) Object.values(data.objective).forEach(val => val === true && (score += 10));
        if (data.subjective) Object.values(data.subjective).forEach(val => val === true && (score += 15));
        setProbability(Math.min(score, 100));
    }, [data]);

    const handleToggle = (section, key) => {
        if (readOnly) return;
        
        // Atualiza estado local
        const newData = {
            ...data,
            [section]: {
                ...data[section],
                [key]: !data[section][key]
            }
        };
        setData(newData);
        
        // Avisa o pai para ele poder salvar, mas o pai NÃO precisa devolver os dados
        if (onUpdate) {
            let s = 0;
            if (newData.objective) Object.values(newData.objective).forEach(v => v === true && (s += 10));
            if (newData.subjective) Object.values(newData.subjective).forEach(v => v === true && (s += 15));
            
            onUpdate({
                agreement_checklist_data: newData,
                agreement_probability: Math.min(s, 100)
            });
        }
    };

    const getColor = (prob) => prob >= 70
        ? 'var(--success-primary)'
        : (prob >= 40 ? 'var(--warning-primary)' : 'var(--danger-primary)');

    const formatLabel = (str) => {
        if (!str) return '';
        return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div style={{ padding: '15px', border: '1px solid var(--border-color-light)', borderRadius: '18px', background: 'var(--surface-panel-muted)' }}>
            <div style={{ 
                borderLeft: `5px solid ${getColor(probability)}`, 
                paddingLeft: '12px', 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Probabilidade de Acordo</h3>
                <span style={{ color: getColor(probability), fontWeight: '800', fontSize: '1.25rem' }}>
                    {probability}%
                </span>
            </div>

            <div style={{marginBottom: '24px'}}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color-light)', paddingBottom: '6px', fontSize: '0.95rem' }}>
                    Critérios Objetivos 
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
                    {Object.keys(SAFE_STRUCTURE.objective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer', fontSize: '0.9rem'}}>
                            <input 
                                type="checkbox" 
                                checked={!!data.objective[key]} 
                                onChange={() => handleToggle('objective', key)}
                                disabled={readOnly}
                                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color-light)', paddingBottom: '6px', fontSize: '0.95rem' }}>
                    Critérios Subjetivos 
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
                    {Object.keys(SAFE_STRUCTURE.subjective).map(key => (
                        <label key={key} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer', fontSize: '0.9rem'}}>
                            <input 
                                type="checkbox" 
                                checked={!!data.subjective[key]} 
                                onChange={() => handleToggle('subjective', key)}
                                disabled={readOnly}
                                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgreementChecklist;
