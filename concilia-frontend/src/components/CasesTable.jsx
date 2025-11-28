// src/components/CasesTable.jsx
// ATUALIZADO: Corrigida a quebra de linha nas tags de status

import React from 'react';
import { Link } from 'react-router-dom';

// ADICIONADO: Mapa de status (baseado nos seus gráficos)
const STATUS_DETAILS = {
    'initial_analysis': { name: 'Análise Inicial', color: '#4299E1', textColor: '#FFFFFF' },
    'proposal_sent': { name: 'Proposta Enviada', color: '#48BB78', textColor: '#FFFFFF' },
    'in_negotiation': { name: 'Em Negociação', color: '#ECC94B', textColor: '#1A202C' }, // Texto escuro para legibilidade
    'awaiting_draft': { name: 'Aguardando Minuta', color: '#ED8936', textColor: '#FFFFFF' },
    'closed_deal': { name: 'Acordo Fechado', color: '#38B2AC', textColor: '#FFFFFF' },
    'failed_deal': { name: 'Acordo Frustrado', color: '#E53E3E', textColor: '#FFFFFF' },
};

// ADICIONADO: Estilo padrão para a tag
const tagStyle = {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap' // <-- ESTA É A CORREÇÃO
};


const CasesTable = ({ cases }) => {
    if (!cases || cases.length === 0) {
        return <p>Nenhum caso encontrado.</p>;
    }

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR').format(date);
    };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #4a5568' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Processo</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Autor</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Valor da Causa</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Advogado</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Data Distribuição</th>
                </tr>
            </thead>
            <tbody>
                {cases.map((legalCase) => {
                    // ADICIONADO: Lógica para buscar os detalhes do status
                    const statusKey = legalCase.status || 'default';
                    const statusInfo = STATUS_DETAILS[statusKey] || { 
                        name: legalCase.status.replace('_', ' '), // Fallback (ex: "proposal sent")
                        color: '#A0AEC0',       // Cor cinza
                        textColor: '#1A202C'   // Texto escuro
                    };

                    return (
                        <tr key={legalCase.id} style={{ borderBottom: '1px solid #2d3748' }}>
                            <td style={{ padding: '12px' }}>
                                <Link to={`/cases/${legalCase.id}`} style={{ color: '#63b3ed', textDecoration: 'none' }}>
                                    {legalCase.case_number}
                                </Link>
                            </td>
                            <td style={{ padding: '12px' }}>{legalCase.client?.name || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{legalCase.opposing_party}</td>
                            <td style={{ padding: '12px' }}>
                                {formatCurrency(legalCase.cause_value)}
                            </td>
                            
                            {/* --- CÉLULA DE STATUS MODIFICADA --- */}
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    ...tagStyle, // Aplica o estilo base
                                    backgroundColor: statusInfo.color,
                                    color: statusInfo.textColor,
                                }}>
                                    {statusInfo.name}
                                </span>
                            </td>
                            {/* --- FIM DA MODIFICAÇÃO --- */}
                            
                            <td style={{ padding: '12px' }}>{legalCase.lawyer?.name || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{formatDate(legalCase.start_date || legalCase.created_at)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default CasesTable;