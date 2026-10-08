// src/components/PipelineColumn.jsx
// Coluna do pipeline no padrão das colunas da "Distribuição diária" do Flow: cabeçalho
// em caixa alta com o total animado e destaque quando um card é arrastado por cima.

import React from 'react';
import CaseCard from './CaseCard';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import NumberFlow from '@number-flow/react';
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
    canKeepContraIndication = false,
    onKeepContraIndication,
    keepingContraCaseId = null,
    openingCaseId = null,
}) => {
    const { setNodeRef } = useDroppable({ id, disabled: !enableDrag });
    const { active, over } = useDndContext();
    const caseIds = cases.map(c => c.id);

    const isDragging = enableDrag && Boolean(active);
    const isDropTarget = isDragging && Boolean(over) && (
        String(over.id) === String(id) || caseIds.some((caseId) => String(caseId) === String(over.id))
    );

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
                        canKeepContraIndication={canKeepContraIndication}
                        onKeepContraIndication={onKeepContraIndication}
                        isKeepingContraIndication={keepingContraCaseId === legalCase.id}
                        isOpening={openingCaseId === legalCase.id}
                    />
                ))
            ) : (
                <p className={styles.pipelineEmptyState}>
                    {isDragging ? 'Solte o card aqui.' : 'Nenhum caso nesta etapa.'}
                </p>
            )}
        </div>
    );

    return (
        <div
            ref={enableDrag ? setNodeRef : undefined}
            className={`${styles.pipelineColumn} ${isDragging ? styles.pipelineColumnDragging : ''} ${isDropTarget ? styles.pipelineColumnDropTarget : ''}`}
            style={columnStyle}
        >
            <header className={styles.pipelineColumnHeader}>
                <h3 className={styles.pipelineColumnTitle} title={title}>
                    {title}
                    {titleTooltip && (
                        <span className={styles.columnTooltip} title={titleTooltip}>
                            <FaInfoCircle />
                        </span>
                    )}
                </h3>
                <div className={styles.pipelineColumnCount}>
                    <span className={styles.pipelineColumnCountValue}>
                        <NumberFlow value={cases.length} locales="pt-BR" />
                    </span>
                    <span className={styles.pipelineColumnCountLabel}>{cases.length === 1 ? 'caso' : 'casos'}</span>
                </div>
            </header>

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
