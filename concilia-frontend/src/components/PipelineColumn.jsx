// src/components/PipelineColumn.jsx
// ATUALIZADO: Fundo da coluna mais escuro no modo claro para maior contraste

import React from 'react';
import CaseCard from './CaseCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
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
    const { setNodeRef } = useDroppable({ id, disabled: !enableDrag });
    const caseIds = cases.map(c => c.id);

    const columnStyle = {
        '--pipeline-column-bg': 'var(--surface-card-sunken)',
        '--pipeline-column-border': 'var(--border-color-light)',
        '--pipeline-column-heading': 'var(--text-primary)',
        '--pipeline-column-empty': 'var(--text-secondary)',
    };

    const columnBody = (
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
    );

    return (
        <div ref={enableDrag ? setNodeRef : undefined} className={styles.pipelineColumn} style={columnStyle}>
            <h3 className={styles.pipelineColumnHeader}>
                {title} ({cases.length})
            </h3>

            {enableDrag ? (
                <SortableContext id={id} items={caseIds}>
                    {columnBody}
                </SortableContext>
            ) : (
                columnBody
            )}
        </div>
    );
};

export default PipelineColumn;
