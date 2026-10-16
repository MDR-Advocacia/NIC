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
import MetricInfoHint from './MetricInfoHint';

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

// Operadores fora da distribuição (férias, ausência): lembrados para a próxima triagem neste navegador
const EXCLUDED_OPERATORS_KEY = 'nic.weeklyTriage.excludedOperatorIds';

const readExcludedOperatorIds = () => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(EXCLUDED_OPERATORS_KEY) || '[]');
        return Array.isArray(stored) ? stored.map(Number) : [];
    } catch {
        return [];
    }
};

const writeExcludedOperatorIds = (ids) => {
    try {
        window.localStorage.setItem(EXCLUDED_OPERATORS_KEY, JSON.stringify(ids));
    } catch {
        // Sem armazenamento local: a escolha vale só para esta triagem
    }
};

const decisionValue = (item) => {
    if (item.decision === 'proposal' && item.decision_user_id) return `proposal:${item.decision_user_id}`;
    return item.decision || 'keep';
};

const TriageGroup = ({ group, items, operators = [], onDecisionChange, decisionsLocked = false }) => {
    const isDecisionGroup = group.key === 'named_not_operator';
    const [open, setOpen] = useState(isDecisionGroup);
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
                                {isDecisionGroup && <th>Decisão</th>}
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
                                    {isDecisionGroup && (
                                        <td>
                                            <select
                                                className={styles.decisionSelect}
                                                value={decisionValue(item)}
                                                disabled={decisionsLocked}
                                                onChange={(event) => onDecisionChange?.(item.key, event.target.value)}
                                                aria-label={`Decisão para ${item.case_number}`}
                                            >
                                                <option value="keep">Manter como está</option>
                                                <option value="initial">Análise Inicial e distribuir</option>
                                                <optgroup label="Proposta Enviada com…">
                                                    {operators.map((operator) => (
                                                        <option key={operator.id} value={`proposal:${operator.id}`}>{operator.name}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </td>
                                    )}
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
    // Decisões do grupo "Para decidir": { [número só com dígitos]: { action, user_id } }
    const [decisions, setDecisions] = useState({});

    const triageRows = useMemo(
        () => rows
            .filter((row) => row.case_number && row.portal_status)
            .map((row) => ({ case_number: row.case_number, portal_status: row.portal_status, portal_obs: row.portal_obs || null })),
        [rows]
    );

    const request = useCallback(async (mode, operatorIds, decisionsToSend) => {
        const response = await apiClient.post('/cases/weekly-triage', {
            mode,
            rows: triageRows,
            ...(operatorIds ? { operator_ids: operatorIds } : {}),
            redistribute_untreated: redistributeUntreated,
            decisions: decisionsToSend,
            file_name: fileName || null,
        }, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    }, [triageRows, redistributeUntreated, fileName, token]);

    const loadPreview = useCallback(async (operatorIds = selectedOperatorIds, decisionsToSend = decisions) => {
        if (!triageRows.length) return;
        setIsLoading(true);
        setError('');
        try {
            let data = await request('preview', operatorIds, decisionsToSend);
            if (!operatorIds) {
                // Primeira prévia: tira quem ficou fora da distribuição na última triagem (férias etc.)
                const excluded = readExcludedOperatorIds();
                const initialIds = data.operators
                    .map((operator) => operator.id)
                    .filter((id) => !excluded.includes(id));
                setSelectedOperatorIds(initialIds);
                if (initialIds.length !== data.operators.length) {
                    data = await request('preview', initialIds, decisionsToSend);
                }
            }
            setPreview(data);
        } catch (err) {
            setError(err?.response?.data?.message || 'Não foi possível gerar a prévia da triagem.');
        } finally {
            setIsLoading(false);
        }
    }, [request, selectedOperatorIds, decisions, triageRows.length]);

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
        writeExcludedOperatorIds((preview?.operators || []).map((operator) => operator.id).filter((id) => !next.includes(id)));
        loadPreview(next);
    };

    const handleDecisionChange = (key, value) => {
        const [action, userId] = value.split(':');
        const next = { ...decisions, [key]: { action, ...(userId ? { user_id: Number(userId) } : {}) } };
        setDecisions(next);
        loadPreview(selectedOperatorIds, next);
    };

    const handleApply = async () => {
        const message = `Aplicar a triagem?\n\n• ${preview.moves_to_initial} vão para Análise Inicial\n• ${preview.moves_to_proposal} vão para Proposta Enviada\n• ${totalDistributed} serão distribuídos entre ${selectedOperatorIds.length} operadores\n\nCasos em negociação ou com acordo não são alterados. Tudo fica registrado no histórico de cada caso.`;
        if (!window.confirm(message)) return;

        setIsApplying(true);
        setError('');
        try {
            const data = await request('apply', selectedOperatorIds, decisions);
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
                    <h2 className={styles.titleWithHint}>
                        Distribuir a planilha semanal
                        <MetricInfoHint
                            placement="bottom"
                            text="Pendentes voltam para a Análise Inicial. Em tratamento com nome de operador vai para Proposta Enviada com esse operador; sem nome, volta para a Análise Inicial e é redistribuído. Casos em negociação ou com acordo nunca são mexidos."
                        />
                    </h2>
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
                            <span className={styles.blockTitle}>
                                <ArrowRightLeft size={14} /> Quem recebe processos nesta triagem
                                <span className={styles.receiveCount}>
                                    {(selectedOperatorIds || []).length} de {preview.operators.length}
                                </span>
                                <MetricInfoHint
                                    placement="bottom"
                                    text="Clique no nome para tirar quem está de férias ou ausente; o NIC lembra essa escolha na próxima triagem. Quem está fora não recebe distribuição, mas continua recebendo os processos em que é citado na observação."
                                />
                            </span>
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
                                        title={isSelected ? `${operator.name}: clique para tirar da distribuição` : `${operator.name}: clique para voltar a receber`}
                                        aria-pressed={isSelected}
                                    >
                                        <span className={styles.operatorAvatar}>{firstName(operator.name).slice(0, 1)}</span>
                                        <span className={styles.operatorName}>{firstName(operator.name)}</span>
                                        <span className={`${styles.receiveSwitch} ${isSelected ? styles.receiveSwitchOn : ''}`} aria-hidden />
                                        <span className={styles.operatorMeta}>
                                            {isSelected
                                                ? `${operator.distributed} distrib. · ${operator.proposals} propostas`
                                                : `fora da distribuição${operator.proposals ? ` · ${operator.proposals} propostas` : ''}`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.groups}>
                        {GROUPS.map((group) => (
                            <TriageGroup
                                key={group.key}
                                group={group}
                                items={itemsByGroup[group.key] || []}
                                operators={preview.operators}
                                onDecisionChange={handleDecisionChange}
                                decisionsLocked={Boolean(applied) || isLoading}
                            />
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
                                <span className={styles.footerHint}>
                                    Confira os grupos acima
                                    <MetricInfoHint text="Tudo o que a triagem fizer fica registrado no histórico de cada caso e no log de auditoria." />
                                </span>
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
