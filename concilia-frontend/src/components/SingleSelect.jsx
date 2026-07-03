import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaSearch } from 'react-icons/fa';
import styles from '../styles/TagMultiSelect.module.css';

const SingleSelect = ({
    options = [],
    value = '',
    onChange,
    placeholder = 'Selecione',
    emptyOptionLabel = null,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Nenhuma opção encontrada.',
    ariaLabel,
}) => {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const normalized = useMemo(
        () => (Array.isArray(options) ? options : []).map((opt) => ({
            value: String(opt.value ?? opt.id ?? ''),
            label: opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? ''),
        })),
        [options]
    );

    const currentValue = String(value ?? '');
    const selected = normalized.find((opt) => opt.value === currentValue && opt.value !== '');
    const summaryLabel = selected?.label || emptyOptionLabel || placeholder;

    const showSearch = normalized.length >= 6;
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return normalized;
        const term = searchTerm.trim().toLowerCase();
        return normalized.filter((opt) => opt.label.toLowerCase().includes(term));
    }, [normalized, searchTerm]);

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

    const handleSelect = (nextValue) => {
        onChange(nextValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={styles.tagSelect} ref={containerRef}>
            <button
                type="button"
                className={`${styles.trigger} ${selected ? styles.triggerActive : ''}`}
                onClick={() => setIsOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel}
            >
                <span className={styles.triggerText}>{summaryLabel}</span>
                <FaChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    {showSearch && (
                        <div className={styles.searchBox}>
                            <FaSearch />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                autoFocus
                            />
                        </div>
                    )}

                    {emptyOptionLabel !== null && (
                        <button
                            type="button"
                            className={`${styles.allOption} ${!selected ? styles.optionActive : ''}`}
                            onClick={() => handleSelect('')}
                        >
                            {emptyOptionLabel}
                        </button>
                    )}

                    <div className={styles.optionList} role="listbox">
                        {filtered.length > 0 ? (
                            filtered.map((opt) => (
                                <div
                                    key={opt.value}
                                    role="option"
                                    aria-selected={opt.value === currentValue}
                                    className={`${styles.option} ${opt.value === currentValue ? styles.optionActive : ''}`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    <span className={styles.optionText}>{opt.label}</span>
                                </div>
                            ))
                        ) : (
                            <div className={styles.noResults}>{emptyMessage}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleSelect;
