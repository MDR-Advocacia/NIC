// src/pages/GeneralBasePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    FaSearch, FaEye, FaDatabase,
    FaChevronLeft, FaChevronRight,
    FaSort, FaSortUp, FaSortDown
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import styles from '../styles/GeneralBase.module.css';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import {
    LEGAL_CASE_STATUS_OPTIONS,
    getLegalCaseStatusDetails,
} from '../constants/legalCaseStatus';

const StatusTag = ({ status }) => {
    const currentStatus = getLegalCaseStatusDetails(status);
    return (
        <span
            className={styles.statusTag}
            style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}
        >
            {currentStatus.name}
        </span>
    );
};

const getDisplayValue = (value, fallback = '—') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' || typeof value === 'number') {
        const normalizedValue = String(value).trim();
        return normalizedValue || fallback;
    }
    if (typeof value === 'object') {
        return value.name || value.nome || fallback;
    }
    return fallback;
};

const GeneralBasePage = () => {
    const { token } = useAuth();

    const [cases, setCases] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [paginationData, setPaginationData] = useState({
        last_page: 1,
        total: 0,
        from: 0,
        to: 0,
    });

    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        lawyer_id: '',
        scope: 'general_base',
    });

    useEffect(() => {
        const fetchDropdownData = async () => {
            if (!token) return;
            try {
                const response = await apiClient.get('/users', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLawyers(response.data.data || []);
            } catch (err) {
                console.error('Erro ao buscar advogados', err);
            }
        };
        fetchDropdownData();
    }, [token]);

    const fetchCases = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([, value]) => value)
            );
            params.append('page', currentPage);
            params.append('per_page', perPage);
            params.append('sort_by', sortConfig.key);
            params.append('sort_order', sortConfig.direction);

            const response = await apiClient.get(`/cases?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data && response.data.data) {
                setCases(response.data.data);
                setPaginationData({
                    last_page: response.data.last_page,
                    total: response.data.total,
                    from: response.data.from,
                    to: response.data.to,
                });
            } else {
                setCases(response.data || []);
            }
        } catch (err) {
            setError('Não foi possível carregar a base geral de casos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filters, currentPage, perPage, sortConfig]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchCases(); }, 500);
        return () => clearTimeout(timer);
    }, [fetchCases]);

    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey)
            return <FaSort style={{ marginLeft: '5px', color: '#A0AEC0', fontSize: '0.8rem' }} />;
        return sortConfig.direction === 'asc'
            ? <FaSortUp style={{ marginLeft: '5px', color: '#4a5568', fontSize: '0.8rem' }} />
            : <FaSortDown style={{ marginLeft: '5px', color: '#4a5568', fontSize: '0.8rem' }} />;
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const formatValue = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const scopeContent = {
        general_base: {
            subtitle: 'Casos sem alçada — aguardando inclusão na planilha semanal',
            banner: (
                <>
                    Estes casos não possuem alçada e não aparecem no Pipeline ou Gestão de Casos.
                    Para incluí-los no pipeline, faça a atualização da alçada em{' '}
                    <Link to="/import">Importar Dados</Link>.
                </>
            ),
            totalLabel: 'Total sem alçada',
        },
        pipeline: {
            subtitle: 'Casos com alçada — elegíveis para o pipeline de acordos',
            banner: 'Estes casos já possuem alçada atualizada e podem aparecer no Pipeline de Acordos.',
            totalLabel: 'Total com alçada',
        },
        all: {
            subtitle: 'Visão consolidada dos casos com e sem alçada',
            banner: 'Use o filtro de alçada para alternar entre casos com alçada, sem alçada ou visualizar tudo junto.',
            totalLabel: 'Total de casos',
        },
    };

    const currentScopeContent = scopeContent[filters.scope] || scopeContent.general_base;

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1><FaDatabase style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Base Geral</h1>
                    <p>{currentScopeContent.subtitle}</p>
                </div>
            </header>

            <div className={styles.infoBanner}>
                {currentScopeContent.banner}
            </div>

            <section className={styles.kpiGrid}>
                <KpiCard title={currentScopeContent.totalLabel} value={paginationData.total.toString()} />
                <KpiCard
                    title="Valor da Causa (Pág.)"
                    value={formatValue(cases.reduce((acc, c) => acc + (parseFloat(c.cause_value) || 0), 0))}
                />
            </section>

            <section className={styles.filtersContainer}>
                <h3><FaSearch /> Filtros</h3>
                <div className={styles.filterControls}>
                    <input
                        type="text"
                        placeholder="Buscar por processo ou parte..."
                        className={styles.searchInput}
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                    <select
                        className={styles.filterSelect}
                        name="scope"
                        value={filters.scope}
                        onChange={handleFilterChange}
                    >
                        <option value="general_base">Alçada: Sem alçada</option>
                        <option value="pipeline">Alçada: Com alçada</option>
                        <option value="all">Alçada: Todos</option>
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                    >
                        <option value="">Status: Todos</option>
                        {LEGAL_CASE_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.name}</option>
                        ))}
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="lawyer_id"
                        value={filters.lawyer_id}
                        onChange={handleFilterChange}
                    >
                        <option value="">Advogado: Todos</option>
                        {lawyers.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </section>

            <section className={styles.tableContainer}>
                {loading ? (
                    <p>Carregando...</p>
                ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                ) : (
                    <>
                        <div className={styles.paginationTopBar}>
                            <div className={styles.paginationInfoText}>
                                Exibindo {paginationData.from || 0}–{paginationData.to || 0} de {paginationData.total || 0} resultados
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={styles.paginationInfoText}>Exibir:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className={styles.perPageSelect}
                                >
                                    <option value="15">15</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                            </div>
                        </div>

                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => handleSort('id')}
                                    >
                                        ID/Processo {getSortIcon('id')}
                                    </th>
                                    <th>Autor / Réu</th>
                                    <th>Objeto da Ação</th>
                                    <th>Comarca</th>
                                    <th
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => handleSort('cause_value')}
                                    >
                                        Valor da Causa {getSortIcon('cause_value')}
                                    </th>
                                    <th>Status</th>
                                    <th>Advogado</th>
                                    <th>Ver</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            Nenhum caso encontrado com o filtro selecionado.
                                        </td>
                                    </tr>
                                ) : cases.map(legalCase => (
                                    <tr key={legalCase.id}>
                                        <td>
                                            <Link to={`/cases/${legalCase.id}`} className={styles.caseLink}>
                                                #{legalCase.id}
                                            </Link>
                                            <div className={styles.subText}>{legalCase.case_number}</div>
                                        </td>
                                        <td>
                                            <div><small>A:</small> {legalCase.opposing_party || legalCase.plaintiff?.name || '—'}</div>
                                            <div className={styles.subText}><small>R:</small> {legalCase.defendant || legalCase.defendantRel?.name || '—'}</div>
                                        </td>
                                        <td>{getDisplayValue(legalCase.actionObject || legalCase.action_object)}</td>
                                        <td>{legalCase.comarca || '—'}</td>
                                        <td>{formatValue(legalCase.cause_value)}</td>
                                        <td><StatusTag status={legalCase.status} /></td>
                                        <td>{legalCase.lawyer?.name || <span style={{ color: '#E53E3E' }}>Sem advogado</span>}</td>
                                        <td>
                                            <Link to={`/cases/${legalCase.id}`} className={styles.actionIcon}>
                                                <FaEye />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className={styles.paginationFooter}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={styles.paginationBtn}
                            >
                                <FaChevronLeft /> Anterior
                            </button>
                            <span className={styles.paginationPageInfo}>
                                Página {currentPage} de {paginationData.last_page || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(paginationData.last_page, p + 1))}
                                disabled={currentPage >= paginationData.last_page}
                                className={styles.paginationBtn}
                            >
                                Próxima <FaChevronRight />
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default GeneralBasePage;
