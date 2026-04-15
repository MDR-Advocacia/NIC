// src/pages/PipelinePage.jsx
// ATUALIZADO: Implementação completa de DragOver para suportar colunas vazias

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import PipelineColumn from '../components/PipelineColumn';
import EditCaseModal from '../components/EditCaseModal';
import SavedCaseTagsPanel from '../components/SavedCaseTagsPanel';
import { 
    DndContext, 
    PointerSensor, 
    useSensor, 
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import styles from '../styles/Pipeline.module.css';
import { 
    FaExclamationTriangle,
    FaSearch,
    FaSlidersH,
    FaBuilding,
    FaGavel,
    FaUserTie,
    FaUserTag,
    FaSignal,
    FaEraser,
    FaBolt,
    FaTag,
} from 'react-icons/fa';
import {
    LEGAL_CASE_STATUS_DETAILS,
    LEGAL_CASE_STATUS_ORDER,
    UNASSIGNED_RESPONSIBLE_VALUE,
    isTerminalLegalCaseStatus,
} from '../constants/legalCaseStatus';
import { 
    canAccessCaseCreation,
    isIndicatorRole,
    normalizeUserRole,
} from '../constants/access';
import IndicationChecklistModal from '../components/IndicationChecklistModal';

const MAX_API_PAGE_SIZE = 200;
const INITIAL_FILTERS = {
    search: '',
    action_object: '',
    client_id: '',
    lawyer_id: '',
    indicator_user_id: '',
    priority: '',
    tag: '',
};

const fetchAllPaginatedResults = async (endpoint, token, params = {}) => {
    const items = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
        const query = new URLSearchParams({
            ...Object.fromEntries(
                Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
            ),
            page: currentPage,
            per_page: MAX_API_PAGE_SIZE,
        });

        const response = await apiClient.get(`${endpoint}?${query.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const payload = response.data;
        if (Array.isArray(payload)) {
            return payload;
        }

        items.push(...(Array.isArray(payload?.data) ? payload.data : []));
        lastPage = Number(payload?.last_page || 1);
        currentPage += 1;
    } while (currentPage <= lastPage);

    return items;
};

const PipelinePage = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const isIndicator = isIndicatorRole(user?.role);
    const canChooseResponsible = ['administrador', 'supervisor'].includes(user?.role);
    const canChooseIndicator = !isIndicator;
    const canManageSavedTags = ['administrador', 'admin'].includes(normalizeUserRole(user?.role));

    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [savedTags, setSavedTags] = useState([]);
    
    const [editingCase, setEditingCase] = useState(null);
    const [indicationCase, setIndicationCase] = useState(null);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedActionObject, setDebouncedActionObject] = useState('');
    const [showDelayedOnly, setShowDelayedOnly] = useState(false);
    const [activeId, setActiveId] = useState(null); // Rastreia item sendo arrastado

    const searchTerm = filters.search.trim();
    const actionObjectFilter = filters.action_object.trim();
    const clientFilter = filters.client_id || '';
    const lawyerFilter = filters.lawyer_id || '';
    const indicatorFilter = canChooseIndicator ? (filters.indicator_user_id || '') : '';
    const priorityFilter = filters.priority || '';
    const tagFilter = filters.tag || '';
    const selectedClientName = clients.find((client) => String(client.id) === String(filters.client_id))?.name;
    const selectedLawyerName = filters.lawyer_id === UNASSIGNED_RESPONSIBLE_VALUE
        ? 'Sem responsável'
        : lawyers.find((lawyer) => String(lawyer.id) === String(filters.lawyer_id))?.name;
    const selectedIndicatorName = indicators.find((indicator) => String(indicator.id) === String(filters.indicator_user_id))?.name;
    const selectedTagName = savedTags.find((tag) => String(tag.id) === String(filters.tag) || (tag.text || tag.name) === filters.tag)?.text
        || savedTags.find((tag) => String(tag.id) === String(filters.tag) || (tag.text || tag.name) === filters.tag)?.name;
    const priorityLabelMap = {
        baixa: 'Prioridade baixa',
        media: 'Prioridade média',
        alta: 'Prioridade alta',
    };
    const activeFilterChips = [
        searchTerm ? `Busca: ${searchTerm}` : null,
        actionObjectFilter ? `Causa de pedir: ${actionObjectFilter}` : null,
        selectedClientName ? `Cliente: ${selectedClientName}` : null,
        selectedLawyerName ? `Responsável: ${selectedLawyerName}` : null,
        selectedIndicatorName ? `Indicador: ${selectedIndicatorName}` : null,
        filters.priority ? priorityLabelMap[filters.priority] : null,
        selectedTagName ? `Etiqueta: ${selectedTagName}` : null,
        showDelayedOnly ? 'Apenas atrasados (+5 dias)' : null,
    ].filter(Boolean);
    const activeFilterCount = activeFilterChips.length;

    const handleOpenCase = (caseToOpen) => {
        if (!caseToOpen?.id) {
            return;
        }

        if (isIndicator) {
            navigate(`/cases/${caseToOpen.id}`);
            return;
        }

        setEditingCase(caseToOpen);
    };
    const handleCloseEditModal = () => setEditingCase(null);
    const handleOpenIndicationModal = (caseToIndicate) => setIndicationCase(caseToIndicate);
    const handleCloseIndicationModal = () => setIndicationCase(null);

    const handleCaseUpdated = () => {
        fetchAllData();
    };

    const handleCaseIndicated = () => {
        setIndicationCase(null);
        fetchAllData();
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedActionObject(actionObjectFilter);
        }, 500);

        return () => clearTimeout(timer);
    }, [actionObjectFilter]);

    const groupCasesByStatus = useCallback((cases) => {
        const initialGroups = LEGAL_CASE_STATUS_ORDER.reduce((acc, statusKey) => {
            acc[statusKey] = LEGAL_CASE_STATUS_DETAILS[statusKey].name;
            return acc;
        }, {});
        const grouped = Object.keys(initialGroups).reduce((acc, key) => ({ ...acc, [key]: [] }), {});
        [...(cases || [])]
            .sort((firstCase, secondCase) => new Date(secondCase.updated_at) - new Date(firstCase.updated_at))
            .forEach(currentCase => {
            if (grouped[currentCase.status]) {
                grouped[currentCase.status].push(currentCase);
            } else {
                grouped['initial_analysis'].push(currentCase);
            }
        });
        return { grouped, titles: initialGroups };
    }, []);

    const fetchAllData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [clientsResponse, lawyersResponse, caseTagsResponse, indicatorsResponse] = await Promise.all([
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users/operators', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/case-tags', { headers: { Authorization: `Bearer ${token}` } }),
                canChooseIndicator
                    ? apiClient.get('/users/indicators', { headers: { Authorization: `Bearer ${token}` } })
                    : Promise.resolve({ data: [] }),
            ]);

            const fetchedLawyers = Array.isArray(lawyersResponse.data) ? lawyersResponse.data : [];
            const fetchedIndicators = Array.isArray(indicatorsResponse.data) ? indicatorsResponse.data : [];

            const effectiveFilters = {
                search: debouncedSearch,
                action_object: debouncedActionObject,
                client_id: clientFilter,
                lawyer_id: lawyerFilter,
                indicator_user_id: indicatorFilter,
                priority: priorityFilter,
                tag: tagFilter,
            };
            const requiresResponsibleFilter = canChooseResponsible;

            const hasValidResponsibleSelected = lawyerFilter === UNASSIGNED_RESPONSIBLE_VALUE
                || fetchedLawyers.some((lawyer) => String(lawyer.id) === String(lawyerFilter));

            if (lawyerFilter && !hasValidResponsibleSelected) {
                delete effectiveFilters.lawyer_id;
                setFilters((currentFilters) => {
                    if (!currentFilters.lawyer_id) {
                        return currentFilters;
                    }

                    const nextFilters = { ...currentFilters };
                    delete nextFilters.lawyer_id;
                    return nextFilters;
                });
            }

            const hasValidIndicatorSelected = fetchedIndicators.some(
                (indicator) => String(indicator.id) === String(indicatorFilter)
            );

            if (indicatorFilter && !hasValidIndicatorSelected) {
                delete effectiveFilters.indicator_user_id;
                setFilters((currentFilters) => {
                    if (!currentFilters.indicator_user_id) {
                        return currentFilters;
                    }

                    return { ...currentFilters, indicator_user_id: '' };
                });
            }

            if (requiresResponsibleFilter && !effectiveFilters.lawyer_id) {
                const preferredResponsible =
                    fetchedLawyers.find((lawyer) => String(lawyer.id) === String(user?.id))
                    || fetchedLawyers[0];

                if (preferredResponsible) {
                    effectiveFilters.lawyer_id = String(preferredResponsible.id);
                    setFilters((currentFilters) =>
                        currentFilters.lawyer_id
                            ? currentFilters
                            : { ...currentFilters, lawyer_id: String(preferredResponsible.id) }
                    );
                }
            }

            let fetchedCases = [];

            if (isIndicator) {
                const [availableCases, indicatedCases] = await Promise.all([
                    fetchAllPaginatedResults('/cases', token, {
                        ...effectiveFilters,
                        sort_by: 'updated_at',
                        sort_order: 'desc',
                    }),
                    fetchAllPaginatedResults('/cases', token, {
                        ...effectiveFilters,
                        indicator_user_id: String(user?.id || ''),
                        sort_by: 'updated_at',
                        sort_order: 'desc',
                    }),
                ]);

                const mergedCases = new Map();

                [...availableCases, ...indicatedCases].forEach((legalCase) => {
                    mergedCases.set(String(legalCase.id), legalCase);
                });

                fetchedCases = Array.from(mergedCases.values());
            } else {
                fetchedCases = await fetchAllPaginatedResults('/cases', token, {
                    ...effectiveFilters,
                    sort_by: 'updated_at',
                    sort_order: 'desc',
                });
            }

            // Filtro de Atraso
            if (showDelayedOnly) {
                const today = new Date();
                fetchedCases = fetchedCases.filter(c => {
                    if (isTerminalLegalCaseStatus(c.status)) {
                        return false;
                    }

                    const lastUpdate = new Date(c.updated_at);
                    const diffTime = Math.abs(today - lastUpdate);
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return days > 5;
                });
            }

            const groupedCases = groupCasesByStatus(fetchedCases);
            setPipelineData(groupedCases);
            setClients(clientsResponse.data);
            setLawyers(fetchedLawyers);
            setIndicators(fetchedIndicators);
            setSavedTags(Array.isArray(caseTagsResponse.data) ? caseTagsResponse.data : []);
        } catch (err) {
            console.error("Erro pipeline:", err);
            setError('Não foi possível carregar os dados do pipeline.');
        } finally {
            setLoading(false);
        }
    }, [token, groupCasesByStatus, clientFilter, lawyerFilter, indicatorFilter, priorityFilter, tagFilter, debouncedSearch, debouncedActionObject, showDelayedOnly, canChooseResponsible, canChooseIndicator, isIndicator, user?.id]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }));

    // --- LÓGICA DE DRAG & DROP ROBUSTA ---

    // Encontra a coluna onde um ID (de card ou de coluna) está
    const findContainer = (id) => {
        if (!pipelineData?.grouped) return null;
        if (id in pipelineData.grouped) return id;
        
        return Object.keys(pipelineData.grouped).find((key) => 
            pipelineData.grouped[key].find((item) => String(item.id) === String(id))
        );
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        // Move o item visualmente entre colunas durante o arraste
        setPipelineData((prev) => {
            const activeItems = prev.grouped[activeContainer];
            const overItems = prev.grouped[overContainer];
            const activeIndex = activeItems.findIndex((i) => String(i.id) === String(active.id));
            const overIndex = overItems.findIndex((i) => String(i.id) === String(overId));

            let newIndex;
            if (overId in prev.grouped) {
                // Soltou na área vazia da coluna
                newIndex = overItems.length + 1;
            } else {
                // Soltou sobre outro card
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                grouped: {
                    ...prev.grouped,
                    [activeContainer]: [
                        ...prev.grouped[activeContainer].filter((item) => String(item.id) !== String(active.id)),
                    ],
                    [overContainer]: [
                        ...prev.grouped[overContainer].slice(0, newIndex),
                        activeItems[activeIndex],
                        ...prev.grouped[overContainer].slice(newIndex, prev.grouped[overContainer].length),
                    ],
                },
            };
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        // 1. Se soltou fora de qualquer lugar válido, cancela
        if (!over) {
            setActiveId(null);
            return;
        }

        const overId = over.id;
        // Onde o card foi solto (Nova Coluna)
        const overContainer = findContainer(overId);
        
        // Onde o card está agora na memória do React (pode já ser a nova coluna por causa do DragOver)
        const currentContainerOfItem = findContainer(active.id);

        if (!overContainer || !currentContainerOfItem) {
            setActiveId(null);
            return;
        }

        // 2. Encontra o objeto do caso (Card) na lista atual
        const movedCase = pipelineData.grouped[currentContainerOfItem].find(
            (c) => String(c.id) === String(active.id)
        );

        if (!movedCase) {
            setActiveId(null);
            return;
        }

        // 3. A CORREÇÃO PRINCIPAL:
        // Compara o status REAL do banco (movedCase.status) com a coluna de destino (overContainer).
        // Se forem diferentes, houve troca de fase, independente da animação visual.
        const isStatusChange = movedCase.status !== overContainer;

        if (isStatusChange) {
            // Confirmação ao mover para Contra Indicado
            if (overContainer === 'contra_indicated') {
                if (!window.confirm('Tem certeza que deseja marcar este caso como Contraindicado?')) {
                    setActiveId(null);
                    fetchAllData(); // Reverte animação visual
                    return;
                }
            }

            console.log(`🔄 Movendo card ${movedCase.id}: ${movedCase.status} -> ${overContainer}`);

            // Prepara o objeto para enviar ao Backend
            const updatedCasePayload = { 
                ...movedCase, 
                status: overContainer, // Força o novo status
                // Garante que os IDs relacionados sejam mantidos
                client_id: movedCase.client?.id || movedCase.client_id,
                lawyer_id: movedCase.lawyer?.id || movedCase.lawyer_id,
                plaintiff_id: movedCase.plaintiff?.id || movedCase.plaintiff_id,
                defendant_id: movedCase.defendant?.id || movedCase.defendant_id,
                opposing_lawyer_id: movedCase.opposing_lawyer?.id || movedCase.opposing_lawyer_id
            };

            // Remove objetos aninhados para não quebrar a API (se o backend esperar apenas IDs)
            delete updatedCasePayload.client;
            delete updatedCasePayload.lawyer;
            delete updatedCasePayload.plaintiff;
            delete updatedCasePayload.defendant;
            delete updatedCasePayload.opposing_lawyer;

            // 4. Atualiza o State Local para persistir a mudança visualmente
            setPipelineData((prev) => {
                const newGrouped = { ...prev.grouped };
                const listContainer = findContainer(active.id); 
                
                if (listContainer && newGrouped[listContainer]) {
                    const items = [...newGrouped[listContainer]];
                    const itemIndex = items.findIndex(c => String(c.id) === String(active.id));
                    
                    if (itemIndex !== -1) {
                        // Atualiza a propriedade 'status' dentro do objeto para bater com a nova coluna
                        items[itemIndex] = { ...items[itemIndex], status: overContainer };
                        newGrouped[listContainer] = items;
                    }
                }
                return { ...prev, grouped: newGrouped };
            });

            // 5. CHAMA A API PARA SALVAR
            apiClient.put(`/cases/${movedCase.id}`, updatedCasePayload, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(() => {
                console.log("✅ Salvo com sucesso no Backend!");
            })
            .catch(err => {
                console.error("❌ Erro ao atualizar status:", err);
                // Se der erro, recarrega os dados para desfazer a mudança visual enganosa
                fetchAllData(); 
            });
        } 
        else {
            // Lógica de Reordenação na MESMA coluna (apenas visual, ou salva posição se tiver endpoint)
            const activeIndex = pipelineData.grouped[currentContainerOfItem].findIndex((i) => String(i.id) === String(active.id));
            const overIndex = pipelineData.grouped[overContainer].findIndex((i) => String(i.id) === String(overId));

            if (activeIndex !== overIndex) {
                setPipelineData((prev) => ({
                    ...prev,
                    grouped: {
                        ...prev.grouped,
                        [overContainer]: arrayMove(prev.grouped[overContainer], activeIndex, overIndex),
                    },
                }));
            }
        }

        setActiveId(null);
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectSavedTagFilter = (tag) => {
        const tagText = tag?.text || tag?.name || '';
        setFilters((prev) => ({
            ...prev,
            tag: prev.tag === tagText ? '' : tagText,
        }));
    };

    const handleDeleteSavedTag = async (tagToDelete) => {
        if (!tagToDelete?.id) {
            return;
        }

        const confirmed = window.confirm(
            `Tem certeza que deseja excluir a etiqueta "${tagToDelete.text || tagToDelete.name}"?\n\nEssa ação removerá a etiqueta do catálogo e de todos os casos que a utilizam.`
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await apiClient.delete(`/case-tags/${tagToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setSavedTags((currentTags) => currentTags.filter((tag) => tag.id !== tagToDelete.id));
            setFilters((prev) => ({
                ...prev,
                tag: prev.tag === (tagToDelete.text || tagToDelete.name) ? '' : prev.tag,
            }));
            window.alert(response.data?.message || 'Etiqueta excluída com sucesso.');
            fetchAllData();
        } catch (err) {
            console.error('Erro ao excluir etiqueta salva:', err);
            window.alert(err.response?.data?.message || 'Não foi possível excluir a etiqueta.');
        }
    };

    const handleClearFilters = () => {
        setFilters({ ...INITIAL_FILTERS });
        setShowDelayedOnly(false);
    };

    const boardContent = (
        <div className={styles.boardShell}>
            <div className={styles.boardGrid}>
                {pipelineData?.titles && Object.entries(pipelineData.titles).map(([statusKey, statusTitle]) => (
                    <PipelineColumn
                        key={statusKey}
                        id={statusKey}
                        title={statusTitle}
                        cases={pipelineData.grouped[statusKey] || []}
                        onCardClick={handleOpenCase}
                        enableDrag={!isIndicator}
                        canIndicateCase={isIndicator}
                        onIndicateCase={handleOpenIndicationModal}
                    />
                ))}
            </div>
        </div>
    );

    if (loading && !pipelineData) return <p>Carregando pipeline...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1>{isIndicator ? 'Indicações e Acompanhamento' : 'Pipeline de Acordos'}</h1>
                <div className={styles.headerActions}>
                    {canAccessCaseCreation(user?.role) && (
                        <Link to="/cases/create" className={styles.newCaseButton}>
                            + Novo Caso
                        </Link>
                    )}
                </div>
            </div>

            <section className={styles.filterPanel}>
                <div className={styles.filterPanelHeader}>
                    <div className={styles.filterPanelTitleGroup}>
                        <div className={styles.filterPanelIcon}>
                            <FaSlidersH />
                        </div>
                        <div>
                            <h2 className={styles.filterPanelTitle}>{isIndicator ? 'Filtros das Indicações' : 'Filtros do Pipeline'}</h2>
                            <p className={styles.filterPanelSubtitle}>
                                {isIndicator
                                    ? 'Os casos em Análise Inicial continuam disponíveis para indicação, e os processos já indicados por você seguem visíveis nas demais fases apenas para acompanhamento.'
                                    : 'Refine os cards por caso, causa de pedir, cliente, responsável, indicador, prioridade e destaque rapidamente os casos parados.'}
                            </p>
                        </div>
                    </div>

                    <div className={styles.filterPanelMeta}>
                        <strong>{activeFilterCount}</strong>
                        <span>{activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
                        <small><FaBolt /> Atualização automática</small>
                    </div>
                </div>

                <div className={styles.filterGrid}>
                    <div className={`${styles.filterField} ${styles.searchField}`}>
                        <label className={styles.filterFieldLabel}>
                            <FaSearch />
                            <span>Buscar caso</span>
                        </label>
                        <input
                            type="text"
                            className={styles.filterInput}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Número do processo ou nome da parte"
                        />
                    </div>

                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaGavel />
                            <span>Causa de Pedir</span>
                        </label>
                        <input
                            type="text"
                            className={styles.filterInput}
                            value={filters.action_object}
                            onChange={(e) => handleFilterChange('action_object', e.target.value)}
                            placeholder="Digite a causa de pedir"
                        />
                    </div>

                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaBuilding />
                            <span>Cliente</span>
                        </label>
                            <select
                                className={styles.filterSelect}
                                value={clientFilter}
                                onChange={(e) => handleFilterChange('client_id', e.target.value)}
                            >
                                <option value="">Todos</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                    
                    {canChooseResponsible && (
                        <div className={styles.filterField}>
                            <label className={styles.filterFieldLabel}>
                                <FaUserTie />
                                <span>Responsável do Caso</span>
                            </label>
                            <select
                                className={styles.filterSelect}
                                value={lawyerFilter}
                                onChange={(e) => handleFilterChange('lawyer_id', e.target.value)}
                            >
                                <option value="" disabled>Selecione um responsável</option>
                                <option value={UNASSIGNED_RESPONSIBLE_VALUE}>Sem responsável</option>
                                {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                            </select>
                        </div>
                    )}

                    {canChooseIndicator && (
                        <div className={styles.filterField}>
                            <label className={styles.filterFieldLabel}>
                                <FaUserTag />
                                <span>Indicador</span>
                            </label>
                            <select
                                className={styles.filterSelect}
                                value={indicatorFilter}
                                onChange={(e) => handleFilterChange('indicator_user_id', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {indicators.map((indicator) => (
                                    <option key={indicator.id} value={indicator.id}>
                                        {indicator.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaSignal />
                            <span>Prioridade</span>
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={priorityFilter}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>

                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaTag />
                            <span>Etiqueta</span>
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={tagFilter}
                            onChange={(e) => handleFilterChange('tag', e.target.value)}
                        >
                            <option value="">Todas</option>
                            {savedTags.map((tag) => (
                                <option key={tag.id || `${tag.text || tag.name}-${tag.color}`} value={tag.text || tag.name}>
                                    {tag.text || tag.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <SavedCaseTagsPanel
                    tags={savedTags}
                    title="Etiquetas salvas"
                    subtitle="Use as etiquetas como atalho visual de filtro. A exclusão do catálogo fica disponível só para administradores."
                    onSelectTag={handleSelectSavedTagFilter}
                    onDeleteTag={handleDeleteSavedTag}
                    canDelete={canManageSavedTags}
                    selectedValue={filters.tag}
                    selectionMode="filter"
                    compact
                    emptyMessage="Nenhuma etiqueta salva cadastrada até o momento."
                />

                <div className={styles.filterPanelFooter}>
                    <div className={styles.filterSummary}>
                        {activeFilterChips.length > 0 ? (
                            activeFilterChips.map((chip) => (
                                <span
                                    key={chip}
                                    className={`${styles.filterChip} ${chip.includes('Atrasados') || chip.includes('atrasados') ? styles.filterChipAlert : ''}`}
                                >
                                    {chip}
                                </span>
                            ))
                        ) : (
                            <span className={styles.filterHint}>
                                Sem filtros ativos. O pipeline está exibindo a visão completa disponível para o seu perfil.
                            </span>
                        )}
                    </div>

                    <div className={styles.filterActions}>
                        <button
                            type="button"
                            className={styles.clearFilterButton}
                            onClick={handleClearFilters}
                            disabled={activeFilterCount === 0}
                        >
                            <FaEraser />
                            Limpar
                        </button>
                        <button 
                            type="button"
                            className={`${styles.delayedFilterButton} ${showDelayedOnly ? styles.active : ''}`}
                            onClick={() => setShowDelayedOnly(!showDelayedOnly)}
                            title="Mostrar apenas casos parados há mais de 5 dias"
                        >
                            <FaExclamationTriangle />
                            {showDelayedOnly ? 'Mostrando atrasados' : 'Ver atrasados'}
                        </button>
                    </div>
                </div>
            </section>

            {isIndicator && (
                <div className={styles.indicatorInfoBanner}>
                    Você pode indicar casos na coluna de Análise Inicial. Depois da indicação, o acompanhamento das próximas fases continua disponível aqui em modo somente leitura.
                </div>
            )}

            {/* Modal de Edição */}
            {editingCase && (
                <EditCaseModal 
                    legalCase={editingCase} 
                    onClose={handleCloseEditModal} 
                    onCaseUpdated={handleCaseUpdated} 
                    clients={clients} 
                    lawyers={lawyers} 
                />
            )}

            <IndicationChecklistModal
                isOpen={Boolean(indicationCase)}
                legalCase={indicationCase}
                onClose={handleCloseIndicationModal}
                onSuccess={handleCaseIndicated}
            />

            {isIndicator ? (
                boardContent
            ) : (
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    {boardContent}
                </DndContext>
            )}
        </div>
    );
};

export default PipelinePage;
