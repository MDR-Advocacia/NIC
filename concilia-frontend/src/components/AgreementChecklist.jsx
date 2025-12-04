import React, { useState, useEffect } from 'react';
import styles from '../styles/AgreementChecklist.module.css';

const AgreementChecklist = ({ checklistData, onUpdate, readOnly = false }) => {
    // Estrutura padrão caso venha nulo
    const defaultData = {
        objective: {
            materia: false,
            obrigacao: false,
            subsidio: false,
            litigante_habitual: false,
            analise_risco: false,
            pcond_portal: false,
            alcada: false
        },
        subjective: {
            analise_subsidio: false,
            pcond_processual: false
        },
        metadata: {
            analise_risco_data: '',
        }
    };

    const [data, setData] = useState(checklistData || defaultData);
    const [probability, setProbability] = useState(0);

    // CORREÇÃO: Sincroniza o estado local quando os dados do pai (Banco de Dados) chegam
    useEffect(() => {
        if (checklistData) {
            setData(checklistData);
        }
    }, [checklistData]);

    // Recalcula probabilidade sempre que 'data' mudar
    useEffect(() => {
        let score = 0;
        
        // 7 Objetivos = 10% cada
        if (data.objective) {
            Object.values(data.objective).forEach(val => val && (score += 10));
        }
        
        // 2 Subjetivos = 15% cada
        if (data.subjective) {
            Object.values(data.subjective).forEach(val => val && (score += 15));
        }

        setProbability(Math.min(score, 100));
    }, [data]);

    const handleToggle = (section, key) => {
        if (readOnly) return;
        
        const newData = {
            ...data,
            [section]: {
                ...data[section],
                [key]: !data[section][key]
            }
        };
        setData(newData);
        
        if (onUpdate) {
            onUpdate({
                agreement_checklist_data: newData,
                agreement_probability: calculateScore(newData)
            });
        }
    };

    const calculateScore = (d) => {
        let s = 0;
        if (d.objective) Object.values(d.objective).forEach(v => v && (s += 10));
        if (d.subjective) Object.values(d.subjective).forEach(v => v && (s += 15));
        return Math.min(s, 100);
    };

    const getColor = (prob) => prob >= 70 ? '#4caf50' : (prob >= 40 ? '#ff9800' : '#f44336');

    // Helper para formatar labels
    const formatLabel = (str) => {
        const labels = {
            materia: "Matéria [Objetivo]",
            obrigacao: "Obrigação [Objetivo]",
            subsidio: "Subsídio [Objetivo]",
            litigante_habitual: "Litigante Habitual [Objetivo]",
            analise_risco: "Análise de Risco (Data) [Objetivo]",
            pcond_portal: "PCOND Portal [Objetivo]",
            alcada: "Alçada [Objetivo]",
            analise_subsidio: "Análise do Subsídio [Subjetivo]",
            pcond_processual: "PCOND Processual [Subjetivo]"
        };
        return labels[str] || str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className={styles.card}>
            <div className={styles.header} style={{ borderLeft: `5px solid ${getColor(probability)}` }}>
                <h3>Probabilidade de Acordo</h3>
                <span className={styles.score} style={{ color: getColor(probability) }}>
                    {probability}%
                </span>
            </div>

            <div className={styles.section}>
                <h4>Critérios Objetivos <small>(10% cada)</small></h4>
                <div className={styles.grid}>
                    {data.objective && Object.keys(data.objective).map(key => (
                        <label key={key} className={styles.item}>
                            <input 
                                type="checkbox" 
                                checked={data.objective[key]} 
                                onChange={() => handleToggle('objective', key)}
                                disabled={readOnly}
                            />
                            <span>{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className={`${styles.section} ${styles.subjective}`}>
                <h4>Critérios Subjetivos <small>(15% cada)</small></h4>
                <div className={styles.grid}>
                    {data.subjective && Object.keys(data.subjective).map(key => (
                        <label key={key} className={styles.item}>
                            <input 
                                type="checkbox" 
                                checked={data.subjective[key]} 
                                onChange={() => handleToggle('subjective', key)}
                                disabled={readOnly}
                            />
                            <span>{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgreementChecklist;