import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import styles from '../styles/ResponsibleMultiSelect.module.css';

const normalizeValues = (values = []) => (Array.isArray(values) ? values.map(String) : []);

const ResponsibleMultiSelect = ({
    selectedValues = [],
    options = [],
    onChange,
    unassignedValue = '__unassigned__',
    placeholder = 'Todos os responsáveis',
    ariaLabel = 'Filtro de responsáveis',
}) => {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const normalizedSelectedValues = useMemo(() => normalizeValues(selectedValues), [selectedValues]);
    const selectedSet = useMemo(() => new Set(normalizedSelectedValues), [normalizedSelectedValues]);

    const optionItems = useMemo(() => [
        { value: unassignedValue, label: 'Sem responsável' },
        ...options.map((option) => ({
            value: String(option.id),
            label: option.name,
        })),
    ], [options, unassignedValue]);

    const labelByValue = useMemo(() => new Map(
        optionItems.map((option) => [option.value, option.label])
    ), [optionItems]);

    const selectedLabels = normalizedSelectedValues
        .map((value) => labelByValue.get(value))
        .filter(Boolean);

    const summaryLabel = (() => {
        if (selectedLabels.length === 0) {
            return placeholder;
        }

        if (selectedLabels.length === 1) {
            return selectedLabels[0];
        }

        if (selectedLabels.length === 2) {
            return selectedLabels.join(' + ');
        }

        return `${selectedLabels.length} responsáveis`;
    })();

    const filteredOptions = optionItems.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const handleClear = () => {
        onChange([]);
        setSearchTerm('');
    };

    const handleToggle = (value) => {
        const nextValues = selectedSet.has(value)
            ? normalizedSelectedValues.filter((selectedValue) => selectedValue !== value)
            : [...normalizedSelectedValues, value];

        onChange(nextValues);
    };

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleDocumentClick = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('keydown', handleDocumentKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('keydown', handleDocumentKeyDown);
        };
    }, [isOpen]);

    return (
        <div className={styles.responsibleSelect} ref={containerRef}>
            <button
                type="button"
                className={`${styles.trigger} ${normalizedSelectedValues.length > 0 ? styles.triggerActive : ''}`}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel}
            >
                <span className={styles.triggerText}>{summaryLabel}</span>
                {normalizedSelectedValues.length > 0 && (
                    <span className={styles.countBadge}>{normalizedSelectedValues.length}</span>
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
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar responsável"
                        />
                    </div>

                    <button
                        type="button"
                        className={`${styles.allOption} ${normalizedSelectedValues.length === 0 ? styles.optionActive : ''}`}
                        onClick={handleClear}
                    >
                        {placeholder}
                    </button>

                    <div className={styles.optionList} role="listbox" aria-multiselectable="true">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`${styles.option} ${selectedSet.has(option.value) ? styles.optionActive : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedSet.has(option.value)}
                                        onChange={() => handleToggle(option.value)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))
                        ) : (
                            <div className={styles.noResults}>Nenhum responsável encontrado.</div>
                        )}
                    </div>

                    {normalizedSelectedValues.length > 0 && (
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

export default ResponsibleMultiSelect;
