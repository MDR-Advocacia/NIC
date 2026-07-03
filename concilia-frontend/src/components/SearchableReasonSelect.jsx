import React, { useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';

const dropdownStyles = {
    wrapper: {
        position: 'relative',
        width: '100%',
    },
    trigger: {
        width: '100%',
        padding: '0.75rem',
        paddingRight: '2.5rem',
        borderRadius: '5px',
        border: '1px solid var(--border-color-dark, #d1d5db)',
        backgroundColor: '#fff',
        fontSize: '0.9rem',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text-color, #1f2937)',
        outline: 'none',
        transition: 'border-color 0.15s',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    triggerPlaceholder: {
        color: '#9ca3af',
    },
    triggerIcon: {
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: '#9ca3af',
        fontSize: '0.75rem',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid var(--border-color-dark, #d1d5db)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
        overflow: 'hidden',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 0.75rem',
        borderBottom: '1px solid #e5e7eb',
    },
    searchIcon: {
        color: '#9ca3af',
        fontSize: '0.85rem',
        flexShrink: 0,
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '0.875rem',
        color: 'var(--text-color, #1f2937)',
        backgroundColor: 'transparent',
    },
    clearButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#9ca3af',
        fontSize: '0.7rem',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
    },
    list: {
        maxHeight: '340px',
        overflowY: 'auto',
        padding: '4px 0',
    },
    option: {
        padding: '0.6rem 0.75rem',
        fontSize: '0.875rem',
        cursor: 'pointer',
        color: 'var(--text-color, #1f2937)',
        transition: 'background-color 0.1s',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
    },
    optionSelected: {
        backgroundColor: 'var(--primary-color, #2563eb)',
        color: '#fff',
        fontWeight: 500,
    },
    noResults: {
        padding: '0.75rem',
        fontSize: '0.85rem',
        color: '#9ca3af',
        textAlign: 'center',
    },
    backdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 49,
    },
};

const SearchableReasonSelect = ({
    id,
    options = [],
    value,
    onChange,
    placeholder = 'Selecione um motivo',
    loadingText = 'Carregando motivos...',
    disabled = false,
    loading = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const searchRef = useRef(null);

    const sorted = useMemo(
        () => [...options].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')),
        [options],
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return sorted;
        const term = search.trim().toLowerCase();
        return sorted.filter((r) => (r.name || '').toLowerCase().includes(term));
    }, [sorted, search]);

    const selectedLabel = options.find((r) => r.name === value)?.name;

    const handleOpen = () => {
        if (disabled || loading) return;
        setOpen(true);
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 0);
    };

    const handleSelect = (name) => {
        onChange(name);
        setOpen(false);
        setSearch('');
    };

    if (loading) {
        return (
            <div style={dropdownStyles.wrapper}>
                <button type="button" style={{ ...dropdownStyles.trigger, ...dropdownStyles.triggerPlaceholder }} disabled>
                    {loadingText}
                </button>
            </div>
        );
    }

    return (
        <div style={dropdownStyles.wrapper}>
            <input
                type="text"
                id={id}
                name={id}
                value={value}
                required
                readOnly
                tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
            />
            <button
                type="button"
                style={{
                    ...dropdownStyles.trigger,
                    ...(!selectedLabel ? dropdownStyles.triggerPlaceholder : {}),
                    ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                onClick={handleOpen}
                disabled={disabled}
            >
                {selectedLabel || placeholder}
            </button>
            <span style={dropdownStyles.triggerIcon}>
                <FaChevronDown />
            </span>

            {open && (
                <>
                    <div style={dropdownStyles.backdrop} onClick={() => { setOpen(false); setSearch(''); }} />
                    <div style={dropdownStyles.dropdown}>
                        <div style={dropdownStyles.searchBox}>
                            <FaSearch style={dropdownStyles.searchIcon} />
                            <input
                                ref={searchRef}
                                type="text"
                                style={dropdownStyles.searchInput}
                                placeholder="Buscar motivo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button type="button" style={dropdownStyles.clearButton} onClick={() => setSearch('')}>
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                        <div style={dropdownStyles.list}>
                            {filtered.length === 0 ? (
                                <div style={dropdownStyles.noResults}>Nenhum motivo encontrado</div>
                            ) : (
                                filtered.map((r) => (
                                    <div
                                        key={r.id}
                                        style={{
                                            ...dropdownStyles.option,
                                            ...(r.name === value ? dropdownStyles.optionSelected : {}),
                                        }}
                                        onMouseEnter={(e) => {
                                            if (r.name !== value) e.currentTarget.style.backgroundColor = '#f3f4f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (r.name !== value) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                        onClick={() => handleSelect(r.name)}
                                    >
                                        {r.name}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SearchableReasonSelect;
