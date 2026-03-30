// src/components/PipelineColumn.jsx
// ATUALIZADO: Fundo da coluna mais escuro no modo claro para maior contraste

import React from 'react';
import CaseCard from './CaseCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/Pipeline.module.css';

const PipelineColumn = ({
    id,
    title,
    cases,
    onCardClick,
    enableDrag = true,
    canIndicateCase = false,
    onIndicateCase,
}) => {
    const { setNodeRef } = useDroppable({ id });
    const caseIds = cases.map(c => c.id);

    const { theme } = useTheme();

    // 1. MUDANÇA: 'columnBg' usa '--bg-page' para o modo claro
    const columnBg = theme === 'light' ? 'var(--bg-page)' : '#1a202c'; // Usa o fundo da página (cinza)
    
    const secondaryText = theme === 'light' ? '#6c757d' : '#a0aec0';
    const lightBorder = theme === 'light' ? '#dee2e6' : '#4a5568';
    const primaryText = theme === 'light' ? '#212529' : '#e2e8f0';

    const columnStyle = {
        '--pipeline-column-bg': columnBg,
        '--pipeline-column-border': lightBorder,
        '--pipeline-column-heading': primaryText,
        '--pipeline-column-empty': secondaryText,
    };

    return (
        <div ref={setNodeRef} className={styles.pipelineColumn} style={columnStyle}>
            <h3 className={styles.pipelineColumnHeader}>
                {title} ({cases.length})
            </h3>
            
            <SortableContext id={id} items={caseIds}>
                <div className={styles.pipelineColumnBody}>
                    {cases.length > 0 ? (
                        cases.map(legalCase => (
                            <CaseCard 
                                key={legalCase.id} 
                                id={legalCase.id} 
                                legalCase={legalCase} 
                                onClick={() => onCardClick(legalCase)}
                                enableDrag={enableDrag}
                                canIndicate={canIndicateCase && legalCase.status === 'initial_analysis'}
                                onIndicate={onIndicateCase}
                            />
                        ))
                    ) : (
                        <p className={styles.pipelineEmptyState}>
                            Nenhum caso nesta etapa.
                        </p>
                    )}
                </div>
            </SortableContext>
        </div>
    );
};

export default PipelineColumn;
