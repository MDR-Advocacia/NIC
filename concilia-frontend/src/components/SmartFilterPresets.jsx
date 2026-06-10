import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaSave, FaTimes, FaStar, FaTrash, FaFolderOpen } from 'react-icons/fa';
import styles from '../styles/SmartFilterPresets.module.css';

const STORAGE_KEY = 'concilia_smart_filters';

const isFilterEmpty = (filters, initialFilters) => {
    if (!filters) return true;
    return Object.keys(initialFilters).every((key) => {
        const value = filters[key];
        if (Array.isArray(value)) return value.length === 0;
        return !value || value === '';
    });
};

const loadPresets = (userId) => {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const savePresets = (userId, presets) => {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(presets));
    } catch {
        // quota exceeded — silently ignore
    }
};

const SmartFilterPresets = ({
    userId,
    currentFilters,
    initialFilters,
    onApplyPreset,
    lawyers = [],
    indicators = [],
    statusOptions = [],
}) => {
    const [presets, setPresets] = useState(() => loadPresets(userId));
    const [isSaving, setIsSaving] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setPresets(loadPresets(userId));
    }, [userId]);

    const persist = useCallback((next) => {
        setPresets(next);
        savePresets(userId, next);
    }, [userId]);

    const hasActiveFilters = useMemo(
        () => !isFilterEmpty(currentFilters, initialFilters),
        [currentFilters, initialFilters]
    );

    const handleStartSave = () => {
        setIsSaving(true);
        setPresetName('');
        setTimeout(() => inputRef.current?.focus(), 60);
    };

    const handleCancelSave = () => {
        setIsSaving(false);
        setPresetName('');
    };

    const handleSave = () => {
        const trimmed = presetName.trim();
        if (!trimmed) return;

        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: trimmed,
            filters: { ...currentFilters },
            createdAt: new Date().toISOString(),
        };

        persist([newPreset, ...presets]);
        setIsSaving(false);
        setPresetName('');
    };

    const handleDelete = (presetId) => {
        if (confirmDeleteId !== presetId) {
            setConfirmDeleteId(presetId);
            return;
        }
        persist(presets.filter((p) => p.id !== presetId));
        setConfirmDeleteId(null);
    };

    const handleApply = (preset) => {
        if (onApplyPreset) {
            onApplyPreset({ ...initialFilters, ...preset.filters });
        }
    };

    const buildSummary = (filters) => {
        const parts = [];

        const statusValues = Array.isArray(filters.statuses) ? filters.statuses : (filters.status ? [filters.status] : []);
        if (statusValues.length > 0) {
            const names = statusValues.map((s) => {
                const found = statusOptions.find((o) => o.value === s);
                return found ? found.name : s;
            });
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} status`);
        }

        const lawyerIds = Array.isArray(filters.lawyer_ids) ? filters.lawyer_ids : [];
        if (lawyerIds.length > 0) {
            const names = lawyerIds.map((id) => lawyers.find((l) => String(l.id) === String(id))?.name).filter(Boolean);
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} responsáveis`);
        }

        const indicatorIds = Array.isArray(filters.indicator_user_ids) ? filters.indicator_user_ids : [];
        if (indicatorIds.length > 0) {
            const names = indicatorIds.map((id) => indicators.find((i) => String(i.id) === String(id))?.name).filter(Boolean);
            parts.push(names.length <= 2 ? names.join(', ') : `${names.length} indicadores`);
        }

        if (filters.priority) parts.push(`Prioridade: ${filters.priority}`);
        if (filters.tag) parts.push(`Etiqueta: ${filters.tag}`);
        if (filters.action_object) parts.push(`Causa: ${filters.action_object}`);
        if (filters.date_from || filters.date_to) {
            const from = filters.date_from ? filters.date_from.split('-').reverse().join('/') : '';
            const to = filters.date_to ? filters.date_to.split('-').reverse().join('/') : '';
            if (from && to) parts.push(`${from} a ${to}`);
            else if (from) parts.push(`A partir de ${from}`);
            else parts.push(`Até ${to}`);
        }
        if (filters.search) parts.push(`Busca: "${filters.search}"`);

        return parts.length > 0 ? parts.join(' · ') : 'Filtro vazio';
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <FaStar className={styles.titleIcon} />
                    <h4 className={styles.title}>Filtros inteligentes</h4>
                    <span className={styles.badge}>{presets.length}</span>
                </div>

                {!isSaving && (
                    <button
                        type="button"
                        className={styles.saveButton}
                        onClick={handleStartSave}
                        disabled={!hasActiveFilters}
                        title={hasActiveFilters ? 'Salvar filtros atuais como preset' : 'Aplique filtros antes de salvar'}
                    >
                        <FaSave />
                        Salvar filtro atual
                    </button>
                )}
            </div>

            {isSaving && (
                <div className={styles.saveForm}>
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.saveInput}
                        placeholder="Nome do filtro (ex: Squad Norte, Acordos Maio...)"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancelSave();
                        }}
                        maxLength={60}
                    />
                    <button
                        type="button"
                        className={styles.confirmButton}
                        onClick={handleSave}
                        disabled={!presetName.trim()}
                    >
                        Salvar
                    </button>
                    <button type="button" className={styles.cancelButton} onClick={handleCancelSave}>
                        <FaTimes />
                    </button>
                </div>
            )}

            {presets.length === 0 ? (
                <p className={styles.emptyMessage}>
                    Nenhum filtro salvo. Aplique filtros e clique em "Salvar filtro atual" para criar atalhos rápidos.
                </p>
            ) : (
                <div className={styles.presetList}>
                    {presets.map((preset) => (
                        <div key={preset.id} className={styles.presetCard}>
                            <button
                                type="button"
                                className={styles.presetApplyArea}
                                onClick={() => handleApply(preset)}
                                title={`Aplicar: ${preset.name}`}
                            >
                                <FaFolderOpen className={styles.presetIcon} />
                                <div className={styles.presetInfo}>
                                    <strong className={styles.presetName}>{preset.name}</strong>
                                    <span className={styles.presetSummary}>{buildSummary(preset.filters)}</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                className={`${styles.deleteButton} ${confirmDeleteId === preset.id ? styles.deleteConfirm : ''}`}
                                onClick={() => handleDelete(preset.id)}
                                title={confirmDeleteId === preset.id ? 'Confirmar exclusão' : 'Excluir filtro'}
                                onBlur={() => setConfirmDeleteId(null)}
                            >
                                <FaTrash />
                                {confirmDeleteId === preset.id && <span>Confirmar</span>}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SmartFilterPresets;
