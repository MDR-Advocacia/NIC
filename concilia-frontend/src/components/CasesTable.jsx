// src/components/CasesTable.jsx
// ATUALIZADO: Corrigida a quebra de linha nas tags de status

import React from 'react';
import { Link } from 'react-router-dom';
import { getLegalCaseStatusDetails } from '../constants/legalCaseStatus';

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

    const hasRecentAlcadaContext = cases.some((legalCase) => Boolean(legalCase.recent_alcada_event_at));

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

    const getRecentAlcadaEventLabel = (legalCase) => (
        legalCase.recent_alcada_event_type === 'created'
            ? 'Entrou na alçada'
            : 'Alçada atualizada'
    );

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #4a5568' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Processo</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Autor</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>
                        {hasRecentAlcadaContext ? 'Valor da Alçada' : 'Valor da Causa'}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Advogado</th>
                    {hasRecentAlcadaContext && (
                        <th style={{ padding: '12px', textAlign: 'left' }}>Movimentação da Alçada</th>
                    )}
                    <th style={{ padding: '12px', textAlign: 'left' }}>Data Distribuição</th>
                </tr>
            </thead>
            <tbody>
                {cases.map((legalCase) => {
                    const statusInfo = getLegalCaseStatusDetails(legalCase.status);

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
                                {formatCurrency(hasRecentAlcadaContext ? legalCase.original_value : legalCase.cause_value)}
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
                            {hasRecentAlcadaContext && (
                                <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                            {getRecentAlcadaEventLabel(legalCase)}
                                        </strong>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {formatDate(legalCase.recent_alcada_event_at)}
                                        </span>
                                    </div>
                                </td>
                            )}
                            <td style={{ padding: '12px' }}>{formatDate(legalCase.start_date || legalCase.created_at)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default CasesTable;
