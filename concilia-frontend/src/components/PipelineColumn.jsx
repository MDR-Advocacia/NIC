// src/components/PipelineColumn.jsx
// ATUALIZADO: Fundo da coluna mais escuro no modo claro para maior contraste

import React from 'react';
import CaseCard from './CaseCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { FaInfoCircle } from 'react-icons/fa';
import styles from '../styles/Pipeline.module.css';

const PipelineColumn = ({
    id,
    title,
    titleTooltip,
    cases,
    onCardClick,
    enableDrag = true,
    canIndicateCase = false,
    onIndicateCase,
    canRequestReanalysis = false,
    onRequestReanalysis,
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
                        canRequestReanalysis={
                            canRequestReanalysis
                            && ['contra_indicated', 'failed_deal'].includes(legalCase.status)
                        }
                        onRequestReanalysis={onRequestReanalysis}
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
                {title}
                {titleTooltip && (
                    <span className={styles.columnTooltip} title={titleTooltip}>
                        <FaInfoCircle />
                    </span>
                )}
                {' '}({cases.length})
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
