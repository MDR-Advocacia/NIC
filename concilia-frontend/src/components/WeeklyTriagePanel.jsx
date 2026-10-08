// Triagem automática da planilha semanal de campanhas (depois da importação):
// mostra a prévia do que vai acontecer com cada processo e aplica com um clique.
// As regras e a trava (não mexer em negociação/acordo) ficam no backend.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NumberFlow from '@number-flow/react';
import {
    ArrowRightLeft, CheckCircle2, ChevronDown, Inbox, Lock, Search, Send, Shuffle, Sparkles, UserX,
} from 'lucide-react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getLegalCaseStatusDetails } from '../constants/legalCaseStatus';
import styles from '../styles/WeeklyTriagePanel.module.css';

const GROUPS = [
    { key: 'to_proposal', label: 'Proposta enviada para o operador citado', icon: Send, tone: 'success' },
    { key: 'untreated_to_initial', label: 'Em tratamento sem nome → Análise Inicial', icon: Shuffle, tone: 'primary' },
    { key: 'pending_to_initial', label: 'Pendentes no portal → Análise Inicial', icon: Inbox, tone: 'primary' },
    { key: 'kept_advanced', label: 'Mantidos: já em negociação ou com acordo', icon: Lock, tone: 'warning' },
    { key: 'named_not_operator', label: 'Para decidir: observação cita quem não é operador', icon: UserX, tone: 'warning' },
    { key: 'not_found', label: 'Não encontrados no NIC', icon: Search, tone: 'danger' },
];

const statusName = (status) => (status ? getLegalCaseStatusDetails(status).name : '—');

const firstName = (name) => String(name || '').split(' ')[0];

const TriageGroup = ({ group, items }) => {
    const [open, setOpen] = useState(false);
    const Icon = group.icon;
    const changed = items.filter((item) => item.changes_status || (item.new_user_id && item.new_user_id !== item.current_user_id));

    if (!items.length) return null;

    return (
        <div className={`${styles.group} ${styles[`tone_${group.tone}`]}`}>
            <button type="button" className={styles.groupHeader} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                <Icon size={16} className={styles.groupIcon} />
                <span className={styles.groupLabel}>{group.label}</span>
                <span className={styles.groupCount}>
                    {items.length}
                    {changed.length !== items.length && ['to_proposal', 'pending_to_initial', 'untreated_to_initial'].includes(group.key) && (
                        <small> · {changed.length} com mudança</small>
                    )}
                </span>
                <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>

            {open && (
                <div className={styles.groupBody}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Processo</th>
                                <th>Portal</th>
                                <th>No NIC hoje</th>
                                <th>Depois</th>
                                <th>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.case_number}>
                                    <td className={styles.caseNumber}>{item.case_number}</td>
                                    <td>
                                        <span>{item.portal_status || '—'}</span>
                                        {item.portal_obs && <small className={styles.obs} title={item.portal_obs}>{item.portal_obs}</small>}
                                    </td>
                                    <td>{statusName(item.current_status)}</td>
                                    <td>
                                        {item.changes_status ? <strong>{statusName(item.new_status)}</strong> : <span className={styles.muted}>sem mudança</span>}
                                        {item.new_user_name && item.new_user_id !== item.current_user_id && (
                                            <small className={styles.newOwner}>→ {item.new_user_name}</small>
                                        )}
                                    </td>
                                    <td className={styles.reason}>{item.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const WeeklyTriagePanel = ({ rows, fileName, autoStart = false }) => {
    const { token } = useAuth();
    const toast = useToast();
    const [preview, setPreview] = useState(null);
    const [selectedOperatorIds, setSelectedOperatorIds] = useState(null);
    const [redistributeUntreated, setRedistributeUntreated] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applied, setApplied] = useState(null);
    const [error, setError] = useState('');

    const triageRows = useMemo(
        () => rows
            .filter((row) => row.case_number && row.portal_status)
            .map((row) => ({ case_number: row.case_number, portal_status: row.portal_status, portal_obs: row.portal_obs || null })),
        [rows]
    );

    const request = useCallback(async (mode, operatorIds) => {
        const response = await apiClient.post('/cases/weekly-triage', {
            mode,
            rows: triageRows,
            ...(operatorIds ? { operator_ids: operatorIds } : {}),
            redistribute_untreated: redistributeUntreated,
            file_name: fileName || null,
        }, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    }, [triageRows, redistributeUntreated, fileName, token]);

    const loadPreview = useCallback(async (operatorIds = selectedOperatorIds) => {
        if (!triageRows.length) return;
        setIsLoading(true);
        setError('');
        try {
            const data = await request('preview', operatorIds);
            setPreview(data);
            if (!operatorIds) {
                setSelectedOperatorIds(data.operators.filter((operator) => operator.selected).map((operator) => operator.id));
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Não foi possível gerar a prévia da triagem.');
        } finally {
            setIsLoading(false);
        }
    }, [request, selectedOperatorIds, triageRows.length]);

    useEffect(() => {
        if (autoStart && !preview && !applied) {
            loadPreview(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    // Mudou a opção de redistribuir: refaz a prévia
    useEffect(() => {
        if (preview && !applied) {
            loadPreview(selectedOperatorIds);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [redistributeUntreated]);

    const toggleOperator = (operatorId) => {
        const current = selectedOperatorIds || [];
        const next = current.includes(operatorId) ? current.filter((id) => id !== operatorId) : [...current, operatorId];
        setSelectedOperatorIds(next);
        loadPreview(next);
    };

    const handleApply = async () => {
        const message = `Aplicar a triagem?\n\n• ${preview.moves_to_initial} vão para Análise Inicial\n• ${preview.moves_to_proposal} vão para Proposta Enviada\n• ${totalDistributed} serão distribuídos entre ${selectedOperatorIds.length} operadores\n\nCasos em negociação ou com acordo não são alterados. Tudo fica registrado no histórico de cada caso.`;
        if (!window.confirm(message)) return;

        setIsApplying(true);
        setError('');
        try {
            const data = await request('apply', selectedOperatorIds);
            setApplied(data.result);
            setPreview(data);
            toast.success(`Triagem aplicada: ${data.result.to_initial} para Análise Inicial, ${data.result.to_proposal} para Proposta Enviada, ${data.result.distributed} distribuídos.`, 8000);
        } catch (err) {
            setError(err?.response?.data?.message || 'Não foi possível aplicar a triagem.');
        } finally {
            setIsApplying(false);
        }
    };

    const itemsByGroup = useMemo(() => {
        const grouped = {};
        (preview?.items || []).forEach((item) => {
            (grouped[item.group] = grouped[item.group] || []).push(item);
        });
        return grouped;
    }, [preview]);

    const totalDistributed = (preview?.operators || []).reduce((sum, operator) => sum + operator.distributed, 0);

    if (!triageRows.length) return null;

    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <div className={styles.headerIcon}><Sparkles size={20} /></div>
                <div className={styles.headerText}>
                    <span className={styles.eyebrow}>Passo 3 · Triagem automática</span>
                    <h2>Distribuir a planilha semanal</h2>
                    <p>
                        Pendentes voltam para a Análise Inicial; &ldquo;Em tratamento&rdquo; com nome de operador vai para Proposta Enviada com esse operador;
                        sem nome, volta para a Análise Inicial e é redistribuído. Casos em negociação ou com acordo nunca são mexidos.
                    </p>
                </div>
                {!preview && (
                    <button type="button" className={styles.primaryButton} onClick={() => loadPreview(null)} disabled={isLoading}>
                        {isLoading ? 'Gerando prévia...' : 'Gerar prévia'}
                    </button>
                )}
            </header>

            {error && <div className={styles.error}>{error}</div>}

            {preview && (
                <>
                    <div className={styles.strip}>
                        <div className={styles.stat}><span>Para Análise Inicial</span><strong><NumberFlow value={preview.moves_to_initial} locales="pt-BR" /></strong></div>
                        <div className={styles.stat}><span>Para Proposta Enviada</span><strong><NumberFlow value={preview.moves_to_proposal} locales="pt-BR" /></strong></div>
                        <div className={styles.stat}><span>Distribuídos</span><strong><NumberFlow value={totalDistributed} locales="pt-BR" /></strong></div>
                        <div className={`${styles.stat} ${styles.statWarning}`}><span>Mantidos (avançados)</span><strong><NumberFlow value={preview.groups?.kept_advanced || 0} locales="pt-BR" /></strong></div>
                        <div className={`${styles.stat} ${styles.statWarning}`}><span>Para decidir</span><strong><NumberFlow value={(preview.groups?.named_not_operator || 0) + (preview.groups?.not_found || 0)} locales="pt-BR" /></strong></div>
                    </div>

                    <div className={styles.operatorsBlock}>
                        <div className={styles.operatorsHeader}>
                            <span className={styles.blockTitle}><ArrowRightLeft size={14} /> Operadores que entram na distribuição</span>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={redistributeUntreated}
                                    disabled={Boolean(applied) || isLoading}
                                    onChange={(event) => setRedistributeUntreated(event.target.checked)}
                                />
                                Redistribuir também os &ldquo;Em tratamento&rdquo; sem nome que já têm responsável
                            </label>
                        </div>
                        <div className={styles.operators}>
                            {preview.operators.map((operator) => {
                                const isSelected = (selectedOperatorIds || []).includes(operator.id);
                                return (
                                    <button
                                        key={operator.id}
                                        type="button"
                                        className={`${styles.operatorChip} ${isSelected ? styles.operatorChipOn : ''}`}
                                        onClick={() => toggleOperator(operator.id)}
                                        disabled={Boolean(applied) || isLoading}
                                        title={operator.name}
                                    >
                                        <span className={styles.operatorAvatar}>{firstName(operator.name).slice(0, 1)}</span>
                                        <span className={styles.operatorName}>{firstName(operator.name)}</span>
                                        <span className={styles.operatorMeta}>
                                            {operator.distributed} distrib. · {operator.proposals} propostas
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.groups}>
                        {GROUPS.map((group) => (
                            <TriageGroup key={group.key} group={group} items={itemsByGroup[group.key] || []} />
                        ))}
                    </div>

                    <footer className={styles.footer}>
                        {applied ? (
                            <span className={styles.applied}>
                                <CheckCircle2 size={18} />
                                Triagem aplicada: {applied.to_initial} para Análise Inicial, {applied.to_proposal} para Proposta Enviada,
                                {' '}{applied.distributed} distribuídos, {applied.kept_advanced} mantidos.
                            </span>
                        ) : (
                            <>
                                <span className={styles.footerHint}>Confira os grupos acima. Tudo fica registrado no histórico de cada caso.</span>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={handleApply}
                                    disabled={isApplying || isLoading || !(selectedOperatorIds || []).length}
                                >
                                    {isApplying ? 'Aplicando...' : 'Aplicar triagem'}
                                </button>
                            </>
                        )}
                    </footer>
                </>
            )}
        </section>
    );
};

export default WeeklyTriagePanel;
