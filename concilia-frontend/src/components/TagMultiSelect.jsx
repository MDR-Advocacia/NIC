import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaSearch, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { normalizeCaseTag } from '../constants/caseTags';
import styles from '../styles/TagMultiSelect.module.css';

const toTagKey = (tag) => {
    if (typeof tag === 'string') return tag.toLocaleLowerCase('pt-BR');
    const normalized = normalizeCaseTag(tag);
    return normalized?.text?.toLocaleLowerCase('pt-BR') || '';
};

const TagMultiSelect = ({
    tags = [],
    selectedValues = [],
    onChange,
    onDelete,
    canDelete = false,
    placeholder = 'Todas as etiquetas',
    searchPlaceholder = 'Buscar etiqueta',
    emptyMessage = 'Nenhuma etiqueta encontrada.',
}) => {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const normalizedTags = useMemo(() => {
        const seen = new Set();
        return (Array.isArray(tags) ? tags : []).reduce((acc, tag) => {
            const normalized = normalizeCaseTag(tag);
            if (!normalized) return acc;
            const key = toTagKey(normalized);
            if (seen.has(key)) return acc;
            seen.add(key);
            acc.push({ ...normalized, id: tag?.id ?? null });
            return acc;
        }, []);
    }, [tags]);

    const selectedSet = useMemo(
        () => new Set((Array.isArray(selectedValues) ? selectedValues : []).map((v) => toTagKey(v))),
        [selectedValues]
    );

    const selectedLabels = normalizedTags
        .filter((tag) => selectedSet.has(toTagKey(tag)))
        .map((tag) => tag.text);

    const summaryLabel = (() => {
        if (selectedLabels.length === 0) return placeholder;
        if (selectedLabels.length === 1) return selectedLabels[0];
        if (selectedLabels.length === 2) return selectedLabels.join(' + ');
        return `${selectedLabels.length} etiquetas`;
    })();

    const filtered = normalizedTags.filter((tag) =>
        tag.text.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const handleToggle = (tag) => {
        const key = toTagKey(tag);
        const current = Array.isArray(selectedValues) ? selectedValues : [];
        const next = selectedSet.has(key)
            ? current.filter((v) => toTagKey(v) !== key)
            : [...current, tag.text];
        onChange(next);
    };

    const handleClear = () => {
        onChange([]);
        setSearchTerm('');
    };

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

    return (
        <div className={styles.tagSelect} ref={containerRef}>
            <button
                type="button"
                className={`${styles.trigger} ${selectedSet.size > 0 ? styles.triggerActive : ''}`}
                onClick={() => setIsOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={styles.triggerText}>{summaryLabel}</span>
                {selectedSet.size > 0 && (
                    <span className={styles.countBadge}>{selectedSet.size}</span>
                )}
                <FaChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchPlaceholder}
                        />
                    </div>

                    <button
                        type="button"
                        className={`${styles.allOption} ${selectedSet.size === 0 ? styles.optionActive : ''}`}
                        onClick={handleClear}
                    >
                        {placeholder}
                    </button>

                    <div className={styles.optionList} role="listbox" aria-multiselectable="true">
                        {filtered.length > 0 ? (
                            filtered.map((tag) => {
                                const key = toTagKey(tag);
                                const isActive = selectedSet.has(key);
                                return (
                                    <label
                                        key={`${tag.id || tag.text}-${tag.color}`}
                                        className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={() => handleToggle(tag)}
                                        />
                                        <span
                                            className={styles.colorDot}
                                            style={{ background: tag.color || '#6b7280' }}
                                        />
                                        <span className={styles.optionText}>{tag.text}</span>
                                        {canDelete && tag.id && onDelete && (
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(tag); }}
                                                title={`Excluir etiqueta ${tag.text}`}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        )}
                                    </label>
                                );
                            })
                        ) : (
                            <div className={styles.noResults}>{emptyMessage}</div>
                        )}
                    </div>

                    {selectedSet.size > 0 && (
                        <button type="button" className={styles.clearButton} onClick={handleClear}>
                            <FaTimes />
                            Limpar seleção
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagMultiSelect;
