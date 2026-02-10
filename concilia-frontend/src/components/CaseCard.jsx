// src/components/CaseCard.jsx
// ATUALIZADO: Com Alerta Visual de Prazos (SLA)

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '../styles/CaseCard.module.css';
// ADICIONADO: FaClock para o ícone de atraso
import { FaUser, FaLandmark, FaGavel, FaFileAlt, FaCalendarAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';

const CaseCard = ({ id, legalCase, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, data: { status: legalCase.status, caseData: legalCase } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const priorities = {
        alta: { text: 'Alta', class: styles.priorityAlta, tagClass: styles.priorityTagAlta },
        media: { text: 'Média', class: styles.priorityMedia, tagClass: styles.priorityTagMedia },
        baixa: { text: 'Baixa', class: styles.priorityBaixa, tagClass: styles.priorityTagBaixa },
    };
    
    // --- LÓGICA DE SLA (PRAZOS) ---
    // Calcula quantos dias o caso está sem atualização
    const lastUpdate = new Date(legalCase.updated_at);
    const today = new Date();
    const diffTime = Math.abs(today - lastUpdate);
    const daysSinceUpdate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Regra: Se parado há mais de 5 dias, considera "Atrasado"
    // (Você pode ajustar esse número conforme a necessidade)
    const isDelayed = daysSinceUpdate > 5;
    // -----------------------------

    const priorityInfo = priorities[legalCase.priority] || {};

    let economyPercentage = null;
    const originalValue = parseFloat(legalCase.original_value);
    const agreementValue = parseFloat(legalCase.agreement_value);

    if (originalValue > 0 && agreementValue > 0) {
        economyPercentage = ((originalValue - agreementValue) / originalValue) * 100;
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {/* ATUALIZADO: Se estiver atrasado, adiciona a classe .cardDelayed 
                Isso vai sobrescrever a cor da borda de prioridade
            */}
            <div 
                className={`${styles.card} ${priorityInfo.class || ''} ${isDelayed ? styles.cardDelayed : ''}`} 
                onClick={onClick}
            >
                <div className={styles.header} {...listeners}>
                    <span className={styles.caseNumber}>{legalCase.case_number}</span>
                    
                    {/*  Mostra Alerta se atrasado, senão mostra Prioridade */}
                    {isDelayed ? (
                        <span className={styles.delayedTag} title={`Este caso não é atualizado há ${daysSinceUpdate} dias`}>
                            <FaExclamationTriangle /> {daysSinceUpdate}d parado
                        </span>
                    ) : (
                        priorityInfo.text && (
                            <span className={`${styles.priorityTag} ${priorityInfo.tagClass || ''}`}>
                                {priorityInfo.text}
                            </span>
                        )
                    )}
                </div>

                <div className={styles.body}>
                    <div className={styles.infoRow}><FaUser /><span>{legalCase.opposing_party}</span></div>
                    <div className={styles.infoRow}><FaFileAlt /><span>{legalCase.action_object || 'Não informado'}</span></div>
                    
                    <div className={styles.valueRow}>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(legalCase.cause_value || 0)}</span>
                        {economyPercentage !== null && (
                            <span className={economyPercentage >= 0 ? styles.economyPercentage : styles.economyPercentageNegative}>
                                {economyPercentage >= 0 ? '↓' : '↑'} {Math.abs(economyPercentage).toFixed(1)}%
                            </span>
                        )}
                    </div>
                    
                    <div className={styles.infoRow}><FaLandmark /><span>{legalCase.client?.name}</span></div>
                    <div className={styles.infoRow}><FaGavel /><span>Responsável: {legalCase.lawyer?.name}</span></div>
                    
                    {/* Exibe a data da última atualização */}
                    <div className={`${styles.infoRow} ${isDelayed ? styles.textDelayed : ''}`}>
                        <FaClock />
                        <span>
                            {isDelayed ? 'Atenção: ' : ''} 
                            Atualizado em {lastUpdate.toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaseCard;