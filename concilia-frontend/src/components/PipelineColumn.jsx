// src/components/PipelineColumn.jsx
// ATUALIZADO: Fundo da coluna mais escuro no modo claro para maior contraste

import React from 'react';
import CaseCard from './CaseCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useTheme } from '../context/ThemeContext';

const PipelineColumn = ({ id, title, cases, onCardClick }) => {
    const { setNodeRef } = useDroppable({ id });
    const caseIds = cases.map(c => c.id);

    const { theme } = useTheme();

    // 1. MUDANÇA: 'columnBg' usa '--bg-page' para o modo claro
    const columnBg = theme === 'light' ? 'var(--bg-page)' : '#1a202c'; // Usa o fundo da página (cinza)
    
    const secondaryText = theme === 'light' ? '#6c757d' : '#a0aec0';
    const lightBorder = theme === 'light' ? '#dee2e6' : '#4a5568';
    const primaryText = theme === 'light' ? '#212529' : '#e2e8f0';

    const columnStyle = {
        flex: 1,
        minWidth: '300px', 
        backgroundColor: columnBg, // Aplicando a mudança aqui
        padding: '1rem',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 150px)', 
        border: `1px solid ${lightBorder}`
    };

    const casesContainerStyle = {
        flex: 1,
        overflowY: 'auto',
        paddingTop: '1rem',
    };

    return (
        <div ref={setNodeRef} style={columnStyle}>
            <h3 style={{ 
                borderBottom: `2px solid ${lightBorder}`, 
                paddingBottom: '0.5rem', 
                margin: '0 0 0.5rem 0',
                color: primaryText
            }}>
                {title} ({cases.length})
            </h3>
            
            <SortableContext id={id} items={caseIds}>
                <div style={casesContainerStyle}>
                    {cases.length > 0 ? (
                        cases.map(legalCase => (
                            <CaseCard 
                                key={legalCase.id} 
                                id={legalCase.id} 
                                legalCase={legalCase} 
                                onClick={() => onCardClick(legalCase)} 
                            />
                        ))
                    ) : (
                        <p style={{ 
                            color: secondaryText, 
                            textAlign: 'center', 
                            marginTop: '2rem' 
                        }}>
                            Nenhum caso nesta etapa.
                        </p>
                    )}
                </div>
            </SortableContext>
        </div>
    );
};

export default PipelineColumn;