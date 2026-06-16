import React, { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaPlus, FaEdit, FaCheck, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import apiClient from '../api';
import styles from '../styles/ReferenceTables.module.css';

const TABS = [
  {
    key: 'action-objects',
    label: 'Causa de Pedir',
    columns: [{ key: 'name', label: 'Nome' }],
  },
  {
    key: 'plaintiffs',
    label: 'Autor',
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
      { key: 'phone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
    ],
  },
  {
    key: 'defendants',
    label: 'Réu',
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'phone', label: 'Telefone' },
    ],
  },
  {
    key: 'opposing-lawyers',
    label: 'Advogado Adverso',
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'cpf', label: 'CPF' },
      { key: 'oab', label: 'OAB' },
      { key: 'phone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
      { key: 'is_abusive', label: 'Abusivo', type: 'boolean' },
    ],
  },
  {
    key: 'contra-indication-reasons',
    label: 'Motivos de Contraindicação',
    columns: [
      { key: 'category', label: 'Categoria', type: 'category-select' },
      { key: 'name', label: 'Motivo' },
    ],
  },
  {
    key: 'failed-deal-reasons',
    label: 'Motivos de Acordo Frustrado',
    columns: [{ key: 'name', label: 'Motivo' }],
  },
  {
    key: 'reanalysis-reasons',
    label: 'Motivos de Reanálise',
    columns: [{ key: 'name', label: 'Motivo' }],
  },
];

const CATEGORY_OPTIONS = ['Superendividamento', 'Contraindicação', 'Outro'];
const PER_PAGE = 25;

function ReferenceTable({ tab }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    setError('');
    apiClient
      .get(`/${tab.key}`)
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [tab.key]);

  useEffect(() => {
    fetchItems();
    setPage(1);
    setSearch('');
    setEditingId(null);
    setAddingNew(false);
  }, [fetchItems]);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return tab.columns.some((col) => {
      const val = item[col.key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(q);
    });
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const startEdit = (item) => {
    const data = {};
    tab.columns.forEach((col) => {
      data[col.key] = item[col.key] ?? '';
    });
    setEditingId(item.id);
    setEditData(data);
    setAddingNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.put(`/${tab.key}/${editingId}`, editData);
      setEditingId(null);
      fetchItems();
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => {
    const data = {};
    tab.columns.forEach((col) => {
      data[col.key] = col.type === 'boolean' ? false : '';
    });
    setNewData(data);
    setAddingNew(true);
    setEditingId(null);
  };

  const cancelAdd = () => {
    setAddingNew(false);
    setNewData({});
  };

  const saveNew = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/${tab.key}`, newData);
      setAddingNew(false);
      setNewData({});
      fetchItems();
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao criar registro.');
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (col, value) => {
    if (col.type === 'boolean') {
      return value ? (
        <span className={styles.booleanBadgeTrue}>Sim</span>
      ) : (
        <span className={styles.booleanBadgeFalse}>Não</span>
      );
    }
    return value ?? '—';
  };

  const renderEditInput = (col, value, onChange) => {
    if (col.type === 'boolean') {
      return (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(col.key, e.target.checked)}
          />
          {value ? 'Sim' : 'Não'}
        </label>
      );
    }
    if (col.type === 'category-select') {
      return (
        <select
          className={styles.inlineInput}
          value={value || ''}
          onChange={(e) => onChange(col.key, e.target.value)}
        >
          <option value="">Selecione...</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        className={styles.inlineInput}
        value={value || ''}
        onChange={(e) => onChange(col.key, e.target.value)}
      />
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return (
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
        </span>
        <div className={styles.paginationControls}>
          <button
            className={styles.pageNavButton}
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <FaChevronLeft />
          </button>
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className={styles.pageDots}>...</span>
            ) : (
              <button
                key={p}
                className={`${styles.pageButton} ${p === safePage ? styles.pageButtonActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className={styles.pageNavButton}
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button className={styles.addButton} onClick={startAdd} disabled={addingNew}>
          <FaPlus /> Adicionar
        </button>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {tab.columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th style={{ width: '80px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {addingNew && (
              <tr className={styles.editingRow}>
                {tab.columns.map((col) => (
                  <td key={col.key}>
                    {renderEditInput(col, newData[col.key], (key, val) =>
                      setNewData((prev) => ({ ...prev, [key]: val }))
                    )}
                  </td>
                ))}
                <td>
                  <div className={styles.actionCell}>
                    <button
                      className={styles.iconButton}
                      onClick={saveNew}
                      disabled={saving}
                      title="Salvar"
                    >
                      <FaCheck />
                    </button>
                    <button
                      className={`${styles.iconButton} ${styles.iconButtonCancel}`}
                      onClick={cancelAdd}
                      disabled={saving}
                      title="Cancelar"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={tab.columns.length + 1} className={styles.loadingCell}>
                  Carregando...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={tab.columns.length + 1} className={styles.emptyCell}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              paginated.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className={styles.editingRow}>
                    {tab.columns.map((col) => (
                      <td key={col.key}>
                        {renderEditInput(col, editData[col.key], (key, val) =>
                          setEditData((prev) => ({ ...prev, [key]: val }))
                        )}
                      </td>
                    ))}
                    <td>
                      <div className={styles.actionCell}>
                        <button
                          className={styles.iconButton}
                          onClick={saveEdit}
                          disabled={saving}
                          title="Salvar"
                        >
                          <FaCheck />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.iconButtonCancel}`}
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Cancelar"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    {tab.columns.map((col) => (
                      <td key={col.key}>{renderCell(col, item[col.key])}</td>
                    ))}
                    <td>
                      <div className={styles.actionCell}>
                        <button
                          className={styles.iconButton}
                          onClick={() => startEdit(item)}
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
}

export default function ReferenceTablesPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tabelas de Referência</h1>
        <p className={styles.pageSubtitle}>
          Gerencie os dados de referência utilizados no sistema.
        </p>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ReferenceTable key={currentTab.key} tab={currentTab} />
    </div>
  );
}
