// Faixa de números do pipeline (uma linha), no padrão da "Distribuição diária" do Flow:
// cada célula tem rótulo pequeno, número grande animado e, quando faz sentido, um anel
// de proporção. Células clicáveis aplicam o filtro correspondente.

import React, { useMemo } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'motion/react';
import { Clock3, Handshake, Inbox, Layers, MessagesSquare, Wallet, CheckCheck, Gift, FileSignature } from 'lucide-react';
import styles from '../styles/PipelineNumbers.module.css';
import { isTerminalLegalCaseStatus } from '../constants/legalCaseStatus';
import { isRecurrentInQueue } from '../utils/contraRecurrence';

const DAY_MS = 1000 * 60 * 60 * 24;

const Ring = ({ value, total, tone }) => {
    const size = 38;
    const radius = (size - 5) / 2;
    const circumference = 2 * Math.PI * radius;
    const ratio = total > 0 ? Math.min(1, value / total) : 0;

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.ring} aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={radius} className={styles.ringTrack} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className={`${styles.ringValue} ${styles[tone] || ''}`}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ratio)}
            />
        </svg>
    );
};

const Cell = ({ label, value, sub, icon: Icon, ring, tone, onClick, active, title }) => {
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={title}
            className={`${styles.cell} ${onClick ? styles.cellClickable : ''} ${active ? styles.cellActive : ''}`}
        >
            {ring ? <Ring value={ring.value} total={ring.total} tone={tone} /> : Icon && <Icon className={`${styles.cellIcon} ${styles[tone] || ''}`} />}
            <div className={styles.cellText}>
                <span className={styles.cellLabel}>{label}</span>
                <span className={styles.cellValue}>
                    <NumberFlow value={value} locales="pt-BR" />
                </span>
                {sub && <span className={styles.cellSub}>{sub}</span>}
            </div>
        </Tag>
    );
};

const countBy = (grouped, statuses) =>
    statuses.reduce((total, status) => total + (grouped?.[status]?.length || 0), 0);

const PipelineNumbers = ({
    grouped,
    view = 'pre',
    showDelayedOnly = false,
    onToggleDelayed,
    recurrentFilterActive = false,
    onToggleRecurrent,
}) => {
    const stats = useMemo(() => {
        const allCases = Object.values(grouped || {}).flat();
        const today = Date.now();
        const delayed = allCases.filter((legalCase) => {
            if (isTerminalLegalCaseStatus(legalCase?.status)) return false;
            const updatedAt = new Date(legalCase?.updated_at).getTime();
            return Number.isFinite(updatedAt) && Math.ceil(Math.abs(today - updatedAt) / DAY_MS) > 5;
        }).length;
        // A coluna Revisão Rápida também é Análise Inicial no banco
        const initial = [...(grouped?.initial_analysis || []), ...(grouped?.quick_review || [])];

        return {
            total: allCases.length,
            delayed,
            initial: initial.length,
            recurrentInQueue: initial.filter(isRecurrentInQueue).length,
            proposalSent: countBy(grouped, ['proposal_sent']),
            negotiating: countBy(grouped, ['in_negotiation']),
            agreements: countBy(grouped, ['awaiting_draft', 'closed_deal']),
            post: {
                hearing: countBy(grouped, ['closed_in_hearing']),
                payment: countBy(grouped, ['pending_payment']),
                obf: countBy(grouped, ['pending_obf']),
                benefit: countBy(grouped, ['pending_livelo_ourocap']),
                done: countBy(grouped, ['deal_completed']),
            },
        };
    }, [grouped]);

    const delayedCell = (
        <Cell
            label="Atrasados (+5 dias)"
            value={stats.delayed}
            sub={showDelayedOnly ? 'filtro ativo · clique para tirar' : 'clique para ver só eles'}
            ring={{ value: stats.delayed, total: stats.total }}
            tone="toneDanger"
            onClick={onToggleDelayed}
            active={showDelayedOnly}
            title="Casos sem atualização há mais de 5 dias"
        />
    );

    return (
        <motion.div
            className={styles.strip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <Cell label="No pipeline" value={stats.total} sub="com os filtros atuais" icon={Layers} tone="tonePrimary" />

            {view === 'post' ? (
                <>
                    <Cell label="Fechados em audiência" value={stats.post.hearing} icon={FileSignature} tone="tonePrimary" />
                    <Cell label="Aguardando pagamento" value={stats.post.payment} icon={Wallet} tone="toneWarning" />
                    <Cell label="Obrigação de fazer" value={stats.post.obf} icon={Clock3} tone="toneWarning" />
                    <Cell label="Livelo / Ourocap" value={stats.post.benefit} icon={Gift} tone="tonePrimary" />
                    <Cell label="Concluídos" value={stats.post.done} icon={CheckCheck} tone="toneSuccess" />
                    {delayedCell}
                </>
            ) : (
                <>
                    <Cell
                        label="Análise inicial"
                        value={stats.initial}
                        sub={`${stats.initial - stats.recurrentInQueue} novos`}
                        icon={Inbox}
                        tone="tonePrimary"
                    />
                    <Cell
                        label="Já contraindicados"
                        value={stats.recurrentInQueue}
                        sub={recurrentFilterActive ? 'filtro ativo · clique para tirar' : 'na análise inicial · revisão rápida'}
                        ring={{ value: stats.recurrentInQueue, total: stats.initial }}
                        tone="toneWarning"
                        onClick={onToggleRecurrent}
                        active={recurrentFilterActive}
                        title="Casos da análise inicial que já foram contraindicados antes"
                    />
                    <Cell
                        label="Em negociação"
                        value={stats.proposalSent + stats.negotiating}
                        sub={`${stats.proposalSent} proposta enviada · ${stats.negotiating} negociando`}
                        icon={MessagesSquare}
                        tone="tonePrimary"
                    />
                    <Cell label="Acordos fechados" value={stats.agreements} sub="aguardando minuta + fechados" icon={Handshake} tone="toneSuccess" />
                    {delayedCell}
                </>
            )}
        </motion.div>
    );
};


export default PipelineNumbers;
