import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaSave, FaTimes, FaRegStar, FaTrash, FaChevronDown } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/SmartFilterPresets.module.css';

const isFilterEmpty = (filters, initialFilters) => {
    if (!filters) return true;
    return Object.keys(initialFilters).every((key) => {
        const value = filters[key];
        if (Array.isArray(value)) return value.length === 0;
        return !value || value === '';
    });
};

const SmartFilterPresets = ({
    userId,
    userRole,
    currentFilters,
    initialFilters,
    onApplyPreset,
    lawyers = [],
    indicators = [],
    statusOptions = [],
}) => {
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [presets, setPresets] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [saveAsGlobal, setSaveAsGlobal] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [loading, setLoading] = useState(false);

    const isAdmin = userRole === 'admin' || userRole === 'administrador';

    const fetchPresets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/filter-presets');
            setPresets(res.data || []);
        } catch (e) {
            console.error('Erro ao carregar presets:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPresets(); }, [fetchPresets]);

    const hasActiveFilters = useMemo(
        () => !isFilterEmpty(currentFilters, initialFilters),
        [currentFilters, initialFilters]
    );

    const handleSave = async () => {
        const trimmed = presetName.trim();
        if (!trimmed) return;
        try {
            await apiClient.post('/filter-presets', {
                name: trimmed,
                filters: currentFilters,
                is_global: saveAsGlobal,
            });
            await fetchPresets();
            setIsSaving(false);
            setPresetName('');
            setSaveAsGlobal(false);
        } catch (e) {
            console.error('Erro ao salvar preset:', e);
        }
    };

    const handleDelete = async (presetId) => {
        if (confirmDeleteId !== presetId) {
            setConfirmDeleteId(presetId);
            return;
        }
        try {
            await apiClient.delete(`/filter-presets/${presetId}`);
            await fetchPresets();
        } catch (e) {
            console.error('Erro ao excluir preset:', e);
        }
        setConfirmDeleteId(null);
    };

    const handleToggleFavorite = async (e, presetId) => {
        e.stopPropagation();
        try {
            await apiClient.post(`/filter-presets/${presetId}/toggle-favorite`);
            await fetchPresets();
        } catch (e) {
            console.error('Erro ao favoritar:', e);
        }
    };

    const handleToggleGlobal = async (e, presetId) => {
        e.stopPropagation();
        try {
            await apiClient.post(`/filter-presets/${presetId}/toggle-global`);
            await fetchPresets();
        } catch (e) {
            console.error('Erro ao alterar visibilidade:', e);
        }
    };

    const handleApply = (preset) => {
        try {
            if (onApplyPreset) {
                const merged = { ...initialFilters };
                const saved = preset.filters || {};
                for (const key of Object.keys(merged)) {
                    const val = saved[key];
                    if (val === null || val === undefined) continue;
                    if (Array.isArray(merged[key]) && !Array.isArray(val)) {
                        merged[key] = val ? [val] : [];
                    } else {
                        merged[key] = val;
                    }
                }
                onApplyPreset(merged);
            }
            setIsOpen(false);
        } catch (e) {
            console.error('Erro ao aplicar preset:', e);
        }
    };

    const buildSummary = (filters) => {
        if (!filters) return 'Vazio';
        const parts = [];
        const statusValues = Array.isArray(filters.statuses) ? filters.statuses : (filters.status ? [filters.status] : []);
        if (statusValues.length > 0) {
            const names = statusValues.map((s) => statusOptions.find((o) => o.value === s)?.name || s);
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} status`);
        }
        const lawyerIds = Array.isArray(filters.lawyer_ids) ? filters.lawyer_ids : [];
        if (lawyerIds.length > 0) {
            const names = lawyerIds.map((id) => lawyers.find((l) => String(l.id) === String(id))?.name).filter(Boolean);
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} resp.`);
        }
        const indicatorIds = Array.isArray(filters.indicator_user_ids) ? filters.indicator_user_ids : [];
        if (indicatorIds.length > 0) {
            const names = indicatorIds.map((id) => indicators.find((i) => String(i.id) === String(id))?.name).filter(Boolean);
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} ind.`);
        }
        if (filters.priority) parts.push(filters.priority);
        const tagArr = Array.isArray(filters.tags) ? filters.tags : (filters.tag ? [filters.tag] : []);
        if (tagArr.length > 0) parts.push(tagArr.length <= 2 ? tagArr.join(', ') : `${tagArr.length} etiq.`);
        if (filters.date_from || filters.date_to) {
            const from = filters.date_from ? filters.date_from.split('-').reverse().join('/') : '';
            const to = filters.date_to ? filters.date_to.split('-').reverse().join('/') : '';
            if (from && to) parts.push(`${from} – ${to}`);
            else if (from) parts.push(`De ${from}`);
            else parts.push(`Até ${to}`);
        }
        return parts.length > 0 ? parts.join(' · ') : 'Vazio';
    };

    const sortedPresets = useMemo(() => {
        const favs = presets.filter((p) => p.is_favorite);
        const rest = presets.filter((p) => !p.is_favorite);
        return [...favs, ...rest];
    }, [presets]);

    const globalCount = useMemo(() => presets.filter((p) => p.is_global).length, [presets]);
    const personalCount = useMemo(() => presets.filter((p) => !p.is_global).length, [presets]);

    useEffect(() => {
        if (!isOpen) return;
        const onClickOutside = (e) => {
            if (!containerRef.current?.contains(e.target)) setIsOpen(false);
        };
        const onEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onEsc);
        };
    }, [isOpen]);

    const canDelete = (preset) => preset.user_id === userId || isAdmin;

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={() => setIsOpen((v) => !v)}
            >
                <span className={styles.triggerIcon}>⭐</span>
                <span>Filtros salvos</span>
                {presets.length > 0 && <span className={styles.countBadge}>{presets.length}</span>}
                <FaChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    {hasActiveFilters && !isSaving && (
                        <button
                            type="button"
                            className={styles.saveButton}
                            onClick={() => { setIsSaving(true); setTimeout(() => inputRef.current?.focus(), 60); }}
                        >
                            <FaSave />
                            Salvar filtro atual
                        </button>
                    )}

                    {isSaving && (
                        <div className={styles.saveForm}>
                            <input
                                ref={inputRef}
                                type="text"
                                className={styles.saveInput}
                                placeholder="Nome do filtro..."
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') { setIsSaving(false); setPresetName(''); setSaveAsGlobal(false); }
                                }}
                                maxLength={60}
                            />
                            <div className={styles.saveActions}>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className={`${styles.scopeToggle} ${saveAsGlobal ? styles.scopeGlobal : styles.scopePersonal}`}
                                        onClick={() => setSaveAsGlobal((v) => !v)}
                                        title={saveAsGlobal ? 'Global — todos veem' : 'Pessoal — só você'}
                                    >
                                        {saveAsGlobal ? '🌐' : '👤'}
                                    </button>
                                )}
                                <button type="button" className={styles.confirmButton} onClick={handleSave} disabled={!presetName.trim()}>
                                    Salvar
                                </button>
                                <button type="button" className={styles.cancelButton} onClick={() => { setIsSaving(false); setPresetName(''); setSaveAsGlobal(false); }}>
                                    <FaTimes />
                                </button>
                            </div>
                        </div>
                    )}

                    {loading && presets.length === 0 && (
                        <div className={styles.emptyMessage}>Carregando...</div>
                    )}

                    <div className={styles.presetList}>
                        {!loading && presets.length === 0 ? (
                            <div className={styles.emptyMessage}>Nenhum filtro salvo.</div>
                        ) : (
                            sortedPresets.map((preset) => (
                                <div key={preset.id} className={`${styles.presetItem} ${preset.is_favorite ? styles.presetFavorite : ''}`}>
                                    <button
                                        type="button"
                                        className={styles.favButton}
                                        onClick={(e) => handleToggleFavorite(e, preset.id)}
                                        title={preset.is_favorite ? 'Remover favorito' : 'Favoritar'}
                                    >
                                        {preset.is_favorite ? '📌' : <FaRegStar />}
                                    </button>

                                    {isAdmin ? (
                                        <button
                                            type="button"
                                            className={`${styles.scopeButton} ${preset.is_global ? styles.scopeGlobal : styles.scopePersonal}`}
                                            onClick={(e) => handleToggleGlobal(e, preset.id)}
                                            title={preset.is_global ? 'Clique para tornar pessoal' : 'Clique para tornar global'}
                                        >
                                            {preset.is_global ? '🌐' : '👤'}
                                        </button>
                                    ) : (
                                        <span className={styles.scopeLabel}>
                                            {preset.is_global ? '🌐' : '👤'}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        className={styles.presetApply}
                                        onClick={() => handleApply(preset)}
                                        title={buildSummary(preset.filters)}
                                    >
                                        <div className={styles.presetInfo}>
                                            <strong>{preset.name}</strong>
                                            <span className={styles.presetMeta}>
                                                {preset.is_global ? 'Global' : 'Pessoal'}
                                                {preset.user?.name ? ` · ${preset.user.name}` : ''}
                                            </span>
                                            <span className={styles.presetSummary}>{buildSummary(preset.filters)}</span>
                                        </div>
                                    </button>

                                    {canDelete(preset) && (
                                        <button
                                            type="button"
                                            className={`${styles.deleteButton} ${confirmDeleteId === preset.id ? styles.deleteConfirm : ''}`}
                                            onClick={() => handleDelete(preset.id)}
                                            title={confirmDeleteId === preset.id ? 'Confirmar exclusão' : 'Excluir'}
                                            onBlur={() => setConfirmDeleteId(null)}
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {presets.length > 0 && (
                        <div className={styles.popoverFooter}>
                            <span>🌐 {globalCount} globais</span>
                            <span>👤 {personalCount} pessoais</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartFilterPresets;
