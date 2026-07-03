import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import { getLegalCaseStatusDetails } from '../constants/legalCaseStatus';
import {
    FaArchive, FaSearch, FaUndo, FaUpload, FaFileExcel,
    FaChevronLeft, FaChevronRight, FaCheckSquare, FaSquare,
    FaBoxOpen, FaClipboardList, FaExclamationTriangle,
} from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';
import styles from '../styles/Archive.module.css';
import SingleSelect from '../components/SingleSelect';

const TABS = [
    { key: 'archived', label: 'Arquivados', icon: <FaArchive /> },
    { key: 'archivable', label: 'Arquivar processos', icon: <FaBoxOpen /> },
    { key: 'compare', label: 'Upload para comparação', icon: <FaUpload /> },
];

const ARCHIVE_REASONS = [
    'Contraindicação',
    'Acordo frustrado',
    'Acordo concluído',
    'Arquivamento manual',
];

const ArchivePage = () => {
    const { user } = useAuth();
    const role = user?.role?.toLowerCase() || '';
    const isAdmin = role.includes('admin') || role.includes('supervisor');

    const [activeTab, setActiveTab] = useState('archived');

    // ── Archived tab state ──
    const [archivedData, setArchivedData] = useState([]);
    const [archivedMeta, setArchivedMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 25 });
    const [archivedSummary, setArchivedSummary] = useState({});
    const [archivedSearch, setArchivedSearch] = useState('');
    const [archivedFilter, setArchivedFilter] = useState('');
    const [archivedPage, setArchivedPage] = useState(1);
    const [archivedPerPage, setArchivedPerPage] = useState(25);
    const [archivedLoading, setArchivedLoading] = useState(false);
    const [selectedUnarchive, setSelectedUnarchive] = useState(new Set());

    // ── Archivable tab state ──
    const [archivableCandidates, setArchivableCandidates] = useState([]);
    const [archivableCounts, setArchivableCounts] = useState({});
    const [archivableLoading, setArchivableLoading] = useState(false);
    const [archivableFilter, setArchivableFilter] = useState('');
    const [selectedArchive, setSelectedArchive] = useState(new Set());
    const [archiveReason, setArchiveReason] = useState('');
    const [archivableSearchTerm, setArchivableSearchTerm] = useState('');
    const [archivablePage, setArchivablePage] = useState(1);
    const [archivablePerPage, setArchivablePerPage] = useState(25);

    // ── Compare tab state ──
    const [compareFile, setCompareFile] = useState(null);
    const [compareResults, setCompareResults] = useState(null);
    const [compareSummary, setCompareSummary] = useState(null);
    const [compareLoading, setCompareLoading] = useState(false);
    const [selectedCompareArchive, setSelectedCompareArchive] = useState(new Set());

    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', ids: [] });
    const [feedback, setFeedback] = useState(null);

    // ── Fetch archived ──
    const fetchArchived = useCallback(async () => {
        setArchivedLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', archivedPage);
            params.append('per_page', archivedPerPage);
            if (archivedSearch) params.append('search', archivedSearch);
            if (archivedFilter) params.append('status', archivedFilter);
            const { data } = await apiClient.get(`/archives?${params.toString()}`);
            setArchivedData(data.data || []);
            setArchivedMeta(data.meta || {});
            setArchivedSummary(data.summary || {});
        } catch (e) {
            setFeedback({ type: 'error', text: 'Erro ao carregar arquivados.' });
        }
        setArchivedLoading(false);
    }, [archivedPage, archivedPerPage, archivedSearch, archivedFilter]);

    // ── Fetch archivable ──
    const fetchArchivable = useCallback(async () => {
        setArchivableLoading(true);
        try {
            const { data } = await apiClient.get('/archives/archivable-preview');
            setArchivableCandidates(data.candidates || []);
            setArchivableCounts(data.counts || {});
        } catch (e) {
            setFeedback({ type: 'error', text: 'Erro ao carregar candidatos.' });
        }
        setArchivableLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'archived') fetchArchived();
    }, [activeTab, fetchArchived]);

    useEffect(() => {
        if (activeTab === 'archivable') fetchArchivable();
    }, [activeTab, fetchArchivable]);

    // ── Search debounce for archived ──
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => { setArchivedSearch(debouncedSearch); setArchivedPage(1); }, 400);
        return () => clearTimeout(t);
    }, [debouncedSearch]);

    // ── Archive action ──
    const openArchiveConfirm = (ids, reason) => {
        if (!ids.length) return;
        setConfirmModal({ open: true, type: 'archive', ids, reason });
    };

    const handleArchive = async (ids, reason) => {
        setConfirmModal({ open: false, type: '', ids: [] });
        if (!ids.length) return;
        setActionLoading(true);
        try {
            const { data } = await apiClient.post('/archives/archive', {
                case_ids: ids,
                reason: reason || 'Arquivamento manual',
            });
            setFeedback({ type: 'success', text: data.message });
            setSelectedArchive(new Set());
            setSelectedCompareArchive(new Set());
            fetchArchivable();
            fetchArchived();
        } catch (e) {
            setFeedback({ type: 'error', text: 'Erro ao arquivar.' });
        }
        setActionLoading(false);
    };

    const openUnarchiveConfirm = (ids) => {
        if (!ids.length) return;
        setConfirmModal({ open: true, type: 'unarchive', ids });
    };

    const handleUnarchive = async (ids) => {
        setConfirmModal({ open: false, type: '', ids: [] });
        if (!ids.length) return;
        setActionLoading(true);
        try {
            const { data } = await apiClient.post('/archives/unarchive', { case_ids: ids });
            setFeedback({ type: 'success', text: data.message });
            setSelectedUnarchive(new Set());
            fetchArchived();
        } catch (e) {
            setFeedback({ type: 'error', text: 'Erro ao desarquivar.' });
        }
        setActionLoading(false);
    };

    // ── Compare upload ──
    const handleCompareUpload = async () => {
        if (!compareFile) return;
        setCompareLoading(true);
        try {
            const text = await compareFile.text();
            const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
            const caseNumbers = lines.map(l => l.replace(/[";,]/g, '').trim()).filter(Boolean);

            if (!caseNumbers.length) {
                setFeedback({ type: 'error', text: 'Nenhum número de processo encontrado no arquivo.' });
                setCompareLoading(false);
                return;
            }

            const { data } = await apiClient.post('/archives/compare-upload', { case_numbers: caseNumbers });
            setCompareResults(data.results || []);
            setCompareSummary(data);
        } catch (e) {
            setFeedback({ type: 'error', text: 'Erro ao processar arquivo.' });
        }
        setCompareLoading(false);
    };

    // ── Toggle helpers ──
    const toggleSelection = (set, setter, id) => {
        const next = new Set(set);
        next.has(id) ? next.delete(id) : next.add(id);
        setter(next);
    };

    const toggleAll = (set, setter, items) => {
        if (set.size === items.length) {
            setter(new Set());
        } else {
            setter(new Set(items.map(i => i.id)));
        }
    };

    const formatCurrency = (v) => {
        if (v == null) return '—';
        return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('pt-BR');
    };

    // ── Filtered archivable candidates ──
    const filteredCandidates = archivableCandidates.filter(c => {
        if (archivableFilter && c.status !== archivableFilter) return false;
        if (archivableSearchTerm) {
            const term = archivableSearchTerm.toLowerCase();
            if (!c.case_number?.toLowerCase().includes(term) && !c.opposing_party?.toLowerCase().includes(term)) return false;
        }
        return true;
    });

    // ── Clear feedback after 4s ──
    useEffect(() => {
        if (feedback) {
            const t = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(t);
        }
    }, [feedback]);

    // ── Status badge ──
    const StatusBadge = ({ status }) => {
        const details = getLegalCaseStatusDetails(status);
        return (
            <span className={styles.statusBadge} style={{ background: details.color, color: details.textColor }}>
                {details.name}
            </span>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}><FaArchive /> Arquivados</h1>
                <p className={styles.subtitle}>Gerencie processos arquivados, archive novos ou compare com dados externos.</p>
            </div>

            {feedback && (
                <div className={`${styles.feedback} ${styles[feedback.type]}`}>
                    {feedback.text}
                </div>
            )}

            <div className={styles.tabs}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ════════ TAB: ARQUIVADOS ════════ */}
            {activeTab === 'archived' && (
                <div className={styles.tabContent}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryPill}>{archivedSummary.total || 0} total</span>
                        <span className={styles.summaryPill}>{archivedSummary.contra_indicated || 0} contraindicados</span>
                        <span className={styles.summaryPill}>{archivedSummary.failed_deal || 0} frustrados</span>
                        <span className={styles.summaryPill}>{archivedSummary.deal_completed || 0} concluídos</span>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.searchWrap}>
                            <FaSearch className={styles.searchIcon} />
                            <input
                                className={styles.searchInput}
                                placeholder="Buscar por processo, parte contrária..."
                                value={debouncedSearch}
                                onChange={(e) => setDebouncedSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ flex: '0 0 230px', minWidth: 200 }}>
                            <SingleSelect
                                options={[
                                    { value: 'contra_indicated', label: 'Contraindicado' },
                                    { value: 'failed_deal', label: 'Acordo Frustrado' },
                                    { value: 'deal_completed', label: 'Acordo Concluído' },
                                ]}
                                value={archivedFilter}
                                onChange={(v) => { setArchivedFilter(v); setArchivedPage(1); }}
                                emptyOptionLabel="Todos os status"
                                ariaLabel="Filtro de status"
                            />
                        </div>
                        {isAdmin && selectedUnarchive.size > 0 && (
                            <button className={styles.actionBtn} onClick={() => openUnarchiveConfirm([...selectedUnarchive])} disabled={actionLoading}>
                                <FaUndo /> Desarquivar ({selectedUnarchive.size})
                            </button>
                        )}
                    </div>

                    {archivedLoading ? (
                        <div className={styles.loadingState}>Carregando...</div>
                    ) : archivedData.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaArchive />
                            <p>Nenhum processo arquivado encontrado.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            {isAdmin && (
                                                <th className={styles.colCheck}>
                                                    <button className={styles.checkBtn} onClick={() => toggleAll(selectedUnarchive, setSelectedUnarchive, archivedData)}>
                                                        {selectedUnarchive.size === archivedData.length ? <FaCheckSquare /> : <FaSquare />}
                                                    </button>
                                                </th>
                                            )}
                                            <th>Processo</th>
                                            <th>Parte contrária</th>
                                            <th>Status</th>
                                            <th>Valor original</th>
                                            <th>Valor acordo</th>
                                            <th>Motivo</th>
                                            <th>Arquivado em</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {archivedData.map(c => (
                                            <tr key={c.id}>
                                                {isAdmin && (
                                                    <td className={styles.colCheck}>
                                                        <button className={styles.checkBtn} onClick={() => toggleSelection(selectedUnarchive, setSelectedUnarchive, c.id)}>
                                                            {selectedUnarchive.has(c.id) ? <FaCheckSquare /> : <FaSquare />}
                                                        </button>
                                                    </td>
                                                )}
                                                <td className={styles.caseNum}>{c.case_number}</td>
                                                <td>{c.opposing_party || '—'}</td>
                                                <td><StatusBadge status={c.status} /></td>
                                                <td>{formatCurrency(c.original_value)}</td>
                                                <td>{formatCurrency(c.agreement_value)}</td>
                                                <td>{c.archive_reason || '—'}</td>
                                                <td>{formatDate(c.archived_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.pagination}>
                                <span className={styles.pagInfo}>
                                    {((archivedMeta.current_page - 1) * archivedMeta.per_page) + 1}–{Math.min(archivedMeta.current_page * archivedMeta.per_page, archivedMeta.total)} de {archivedMeta.total}
                                </span>
                                <div className={styles.pagControls}>
                                    <span className={styles.perPageLabel}>Por página:</span>
                                    {[25, 50, 100].map(n => (
                                        <button key={n} className={`${styles.perPageBtn} ${archivedPerPage === n ? styles.perPageBtnActive : ''}`} onClick={() => { setArchivedPerPage(n); setArchivedPage(1); }}>{n}</button>
                                    ))}
                                    {archivedMeta.last_page > 1 && (
                                        <div className={styles.pageNav}>
                                            <button className={styles.pageBtn} disabled={archivedMeta.current_page <= 1} onClick={() => setArchivedPage(p => p - 1)}><FaChevronLeft /></button>
                                            <span className={styles.pageLabel}>{archivedMeta.current_page} / {archivedMeta.last_page}</span>
                                            <button className={styles.pageBtn} disabled={archivedMeta.current_page >= archivedMeta.last_page} onClick={() => setArchivedPage(p => p + 1)}><FaChevronRight /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ════════ TAB: ARQUIVAR PROCESSOS ════════ */}
            {activeTab === 'archivable' && (
                <div className={styles.tabContent}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryPill}>{archivableCounts.contra_indicated || 0} contraindicados</span>
                        <span className={styles.summaryPill}>{archivableCounts.failed_deal || 0} frustrados</span>
                        <span className={styles.summaryPill}>{archivableCounts.deal_completed || 0} concluídos</span>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.searchWrap}>
                            <FaSearch className={styles.searchIcon} />
                            <input
                                className={styles.searchInput}
                                placeholder="Buscar por processo ou parte..."
                                value={archivableSearchTerm}
                                onChange={(e) => setArchivableSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ flex: '0 0 230px', minWidth: 200 }}>
                            <SingleSelect
                                options={[
                                    { value: 'contra_indicated', label: 'Contraindicado' },
                                    { value: 'failed_deal', label: 'Acordo Frustrado' },
                                    { value: 'deal_completed', label: 'Acordo Concluído' },
                                ]}
                                value={archivableFilter}
                                onChange={(v) => { setArchivableFilter(v); setArchivablePage(1); }}
                                emptyOptionLabel="Todos os status"
                                ariaLabel="Filtro de status"
                            />
                        </div>
                        <div style={{ flex: '0 0 260px', minWidth: 220 }}>
                            <SingleSelect
                                options={ARCHIVE_REASONS.map((r) => ({ value: r, label: r }))}
                                value={archiveReason}
                                onChange={setArchiveReason}
                                emptyOptionLabel="Motivo do arquivamento"
                                ariaLabel="Motivo do arquivamento"
                            />
                        </div>
                        {selectedArchive.size > 0 && (
                            <button className={styles.actionBtn} onClick={() => openArchiveConfirm([...selectedArchive], archiveReason)} disabled={actionLoading}>
                                <FaArchive /> Arquivar ({selectedArchive.size})
                            </button>
                        )}
                    </div>

                    {archivableLoading ? (
                        <div className={styles.loadingState}>Carregando candidatos...</div>
                    ) : filteredCandidates.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaClipboardList />
                            <p>Nenhum processo pendente de arquivamento.</p>
                        </div>
                    ) : (() => {
                        const totalFiltered = filteredCandidates.length;
                        const totalPages = Math.ceil(totalFiltered / archivablePerPage);
                        const safePage = Math.min(archivablePage, totalPages || 1);
                        const startIdx = (safePage - 1) * archivablePerPage;
                        const pageItems = filteredCandidates.slice(startIdx, startIdx + archivablePerPage);

                        return (
                            <>
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th className={styles.colCheck}>
                                                    <button className={styles.checkBtn} onClick={() => toggleAll(selectedArchive, setSelectedArchive, filteredCandidates)}>
                                                        {selectedArchive.size === filteredCandidates.length && filteredCandidates.length > 0 ? <FaCheckSquare /> : <FaSquare />}
                                                    </button>
                                                </th>
                                                <th>Processo</th>
                                                <th>Parte contrária</th>
                                                <th>Status</th>
                                                <th>Valor original</th>
                                                <th>Valor acordo</th>
                                                <th>Última atualização</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageItems.map(c => (
                                                <tr key={c.id} className={selectedArchive.has(c.id) ? styles.rowSelected : ''}>
                                                    <td className={styles.colCheck}>
                                                        <button className={styles.checkBtn} onClick={() => toggleSelection(selectedArchive, setSelectedArchive, c.id)}>
                                                            {selectedArchive.has(c.id) ? <FaCheckSquare /> : <FaSquare />}
                                                        </button>
                                                    </td>
                                                    <td className={styles.caseNum}>{c.case_number}</td>
                                                    <td>{c.opposing_party || '—'}</td>
                                                    <td><StatusBadge status={c.status} /></td>
                                                    <td>{formatCurrency(c.original_value)}</td>
                                                    <td>{formatCurrency(c.agreement_value)}</td>
                                                    <td>{formatDate(c.updated_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className={styles.pagination}>
                                    <span className={styles.pagInfo}>
                                        {startIdx + 1}–{Math.min(startIdx + archivablePerPage, totalFiltered)} de {totalFiltered}
                                    </span>
                                    <div className={styles.pagControls}>
                                        <span className={styles.perPageLabel}>Por página:</span>
                                        {[25, 50, 100].map(n => (
                                            <button key={n} className={`${styles.perPageBtn} ${archivablePerPage === n ? styles.perPageBtnActive : ''}`} onClick={() => { setArchivablePerPage(n); setArchivablePage(1); }}>{n}</button>
                                        ))}
                                        {totalPages > 1 && (
                                            <div className={styles.pageNav}>
                                                <button className={styles.pageBtn} disabled={safePage <= 1} onClick={() => setArchivablePage(p => p - 1)}><FaChevronLeft /></button>
                                                <span className={styles.pageLabel}>{safePage} / {totalPages}</span>
                                                <button className={styles.pageBtn} disabled={safePage >= totalPages} onClick={() => setArchivablePage(p => p + 1)}><FaChevronRight /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* ════════ TAB: UPLOAD PARA COMPARAÇÃO ════════ */}
            {activeTab === 'compare' && (
                <div className={styles.tabContent}>
                    <div className={styles.uploadSection}>
                        <div className={styles.uploadCard}>
                            <FaFileExcel className={styles.uploadIcon} />
                            <h3>Upload de lista de processos</h3>
                            <p>Envie um arquivo .txt ou .csv com os números de processos (um por linha) para comparar com a base e identificar quais podem ser arquivados.</p>
                            <div className={styles.uploadActions}>
                                <label className={styles.fileLabel}>
                                    <input
                                        type="file"
                                        accept=".txt,.csv"
                                        className={styles.fileInput}
                                        onChange={(e) => { setCompareFile(e.target.files[0] || null); setCompareResults(null); setCompareSummary(null); }}
                                    />
                                    {compareFile ? compareFile.name : 'Selecionar arquivo'}
                                </label>
                                <button className={styles.actionBtn} onClick={handleCompareUpload} disabled={!compareFile || compareLoading}>
                                    {compareLoading ? 'Processando...' : 'Comparar'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {compareSummary && (
                        <div className={styles.compareSummary}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryPill}>{compareSummary.total_input} no arquivo</span>
                                <span className={styles.summaryPill}>{compareSummary.found} encontrados</span>
                                <span className={`${styles.summaryPill} ${styles.pillWarning}`}>{compareSummary.not_found} não encontrados</span>
                                <span className={styles.summaryPill}>{compareSummary.already_archived} já arquivados</span>
                                <span className={`${styles.summaryPill} ${styles.pillSuccess}`}>{compareSummary.archivable} arquiváveis</span>
                            </div>

                            {selectedCompareArchive.size > 0 && (
                                <div className={styles.toolbar}>
                                    <button className={styles.actionBtn} onClick={() => openArchiveConfirm([...selectedCompareArchive], 'Arquivamento via upload')} disabled={actionLoading}>
                                        <FaArchive /> Arquivar selecionados ({selectedCompareArchive.size})
                                    </button>
                                </div>
                            )}

                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th className={styles.colCheck}>
                                                <button className={styles.checkBtn} onClick={() => {
                                                    const archivableItems = compareResults.filter(r => r.found && !r.already_archived);
                                                    toggleAll(selectedCompareArchive, setSelectedCompareArchive, archivableItems);
                                                }}>
                                                    {(() => {
                                                        const archivableItems = compareResults.filter(r => r.found && !r.already_archived);
                                                        return selectedCompareArchive.size === archivableItems.length && archivableItems.length > 0 ? <FaCheckSquare /> : <FaSquare />;
                                                    })()}
                                                </button>
                                            </th>
                                            <th>Processo</th>
                                            <th>Situação</th>
                                            <th>Status</th>
                                            <th>Parte contrária</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compareResults.map((r, i) => (
                                            <tr key={i} className={!r.found ? styles.rowNotFound : r.already_archived ? styles.rowAlreadyArchived : ''}>
                                                <td className={styles.colCheck}>
                                                    {r.found && !r.already_archived ? (
                                                        <button className={styles.checkBtn} onClick={() => toggleSelection(selectedCompareArchive, setSelectedCompareArchive, r.id)}>
                                                            {selectedCompareArchive.has(r.id) ? <FaCheckSquare /> : <FaSquare />}
                                                        </button>
                                                    ) : <span className={styles.checkDisabled}>—</span>}
                                                </td>
                                                <td className={styles.caseNum}>{r.case_number}</td>
                                                <td>
                                                    {!r.found ? (
                                                        <span className={styles.tagNotFound}><FaExclamationTriangle /> Não encontrado</span>
                                                    ) : r.already_archived ? (
                                                        <span className={styles.tagArchived}>Já arquivado</span>
                                                    ) : (
                                                        <span className={styles.tagArchivable}>Arquivável</span>
                                                    )}
                                                </td>
                                                <td>{r.status ? <StatusBadge status={r.status} /> : '—'}</td>
                                                <td>{r.opposing_party || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <ConfirmModal
                open={confirmModal.open}
                icon={<FaArchive />}
                title={confirmModal.type === 'unarchive' ? 'Desarquivar processos' : 'Arquivar processos'}
                message={
                    confirmModal.type === 'unarchive'
                        ? `Desarquivar ${confirmModal.ids.length} caso(s)? Eles voltarão ao pipeline e à gestão de casos.`
                        : `Arquivar ${confirmModal.ids.length} caso(s)? Eles serão removidos do pipeline, mas poderão ser desarquivados depois.`
                }
                confirmLabel={confirmModal.type === 'unarchive' ? 'Desarquivar' : 'Arquivar'}
                confirmColor={confirmModal.type === 'unarchive' ? '#2563eb' : '#64748b'}
                onConfirm={() => {
                    if (confirmModal.type === 'unarchive') handleUnarchive(confirmModal.ids);
                    else handleArchive(confirmModal.ids, confirmModal.reason);
                }}
                onCancel={() => setConfirmModal({ open: false, type: '', ids: [] })}
            />
        </div>
    );
};

export default ArchivePage;
