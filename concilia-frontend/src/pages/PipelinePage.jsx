// src/pages/PipelinePage.jsx
// ATUALIZADO: Implementação completa de DragOver para suportar colunas vazias

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import PipelineColumn from '../components/PipelineColumn';
import EditCaseModal from '../components/EditCaseModal';
import { 
    DndContext, 
    PointerSensor, 
    useSensor, 
    useSensors,
    closestCorners,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import styles from '../styles/Pipeline.module.css';
import {
    FaExclamationTriangle,
    FaSlidersH,
    FaBuilding,
    FaUserTie,
    FaSignal,
    FaEraser,
    FaBolt,
} from 'react-icons/fa';
import { LEGAL_CASE_STATUS_DETAILS, LEGAL_CASE_STATUS_ORDER } from '../constants/legalCaseStatus';
import {
    canAccessCaseCreation,
    isIndicatorRole,
    normalizeUserRole,
    USER_ROLES,
} from '../constants/access';
import IndicationChecklistModal from '../components/IndicationChecklistModal';

const MAX_API_PAGE_SIZE = 200;

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
    const isIndicator = isIndicatorRole(user?.role);
    const canChooseResponsible = ['administrador', 'supervisor'].includes(user?.role);

    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    
    const [editingCase, setEditingCase] = useState(null);
    const [indicationCase, setIndicationCase] = useState(null);
    const [filters, setFilters] = useState({});
    const [showDelayedOnly, setShowDelayedOnly] = useState(false);
    const [activeId, setActiveId] = useState(null); // Rastreia item sendo arrastado

    const selectedClientName = clients.find((client) => String(client.id) === String(filters.client_id))?.name;
    const selectedLawyerName = lawyers.find((lawyer) => String(lawyer.id) === String(filters.lawyer_id))?.name;
    const priorityLabelMap = {
        baixa: 'Prioridade baixa',
        media: 'Prioridade média',
        alta: 'Prioridade alta',
    };
    const activeFilterChips = [
        selectedClientName ? `Cliente: ${selectedClientName}` : null,
        selectedLawyerName ? `Responsável: ${selectedLawyerName}` : null,
        filters.priority ? priorityLabelMap[filters.priority] : null,
        showDelayedOnly ? 'Apenas atrasados (+5 dias)' : null,
    ].filter(Boolean);
    const activeFilterCount = activeFilterChips.length;

    const handleOpenEditModal = (caseToEdit) => {
        if (isIndicator) {
            return;
        }

        setEditingCase(caseToEdit);
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
            const [clientsResponse, lawyersResponse] = await Promise.all([
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                fetchAllPaginatedResults('/users', token),
            ]);

            const fetchedLawyers = Array.isArray(lawyersResponse)
                ? lawyersResponse.filter(
                    (lawyer) => lawyer?.status === 'ativo'
                        && normalizeUserRole(lawyer?.role) === USER_ROLES.OPERADOR
                )
                : [];

            const effectiveFilters = { ...filters };
            const requiresResponsibleFilter = canChooseResponsible;

            const hasValidResponsibleSelected = fetchedLawyers.some(
                (lawyer) => String(lawyer.id) === String(effectiveFilters.lawyer_id)
            );

            if (effectiveFilters.lawyer_id && !hasValidResponsibleSelected) {
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

            let fetchedCases = await fetchAllPaginatedResults('/cases', token, {
                ...effectiveFilters,
                sort_by: 'updated_at',
                sort_order: 'desc',
            });

            // Filtro de Atraso
            if (showDelayedOnly) {
                const today = new Date();
                fetchedCases = fetchedCases.filter(c => {
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
        } catch (err) {
            console.error("Erro pipeline:", err);
            setError('Não foi possível carregar os dados do pipeline.');
        } finally {
            setLoading(false);
        }
    }, [token, groupCasesByStatus, filters, showDelayedOnly]);

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
                if (!window.confirm('Tem certeza que deseja marcar este caso como Contra Indicado?')) {
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

    const handleClearFilters = () => {
        setFilters({});
        setShowDelayedOnly(false);
    };

    if (loading && !pipelineData) return <p>Carregando pipeline...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1>Pipeline de Acordos</h1>
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
                            <h2 className={styles.filterPanelTitle}>Filtros do Pipeline</h2>
                            <p className={styles.filterPanelSubtitle}>
                                Refine os cards por cliente, responsável, prioridade e destaque rapidamente os casos parados.
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
                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaBuilding />
                            <span>Cliente</span>
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={filters.client_id || ''}
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
                                value={filters.lawyer_id || ''}
                                onChange={(e) => handleFilterChange('lawyer_id', e.target.value)}
                            >
                                <option value="" disabled>Selecione um responsável</option>
                                {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
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
                            value={filters.priority || ''}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>

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
                <div style={{
                    marginBottom: '18px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1e3a8a',
                    fontWeight: 600,
                }}>
                    Os casos em Analise Inicial podem ser avaliados aqui e indicados para acordo pelo checklist obrigatorio.
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
            
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.boardShell}>
                    <div className={styles.boardGrid}>
                    {pipelineData?.titles && Object.entries(pipelineData.titles)
                        .filter(([statusKey]) => !isIndicator || statusKey === 'initial_analysis')
                        .map(([statusKey, statusTitle]) => (
                            <PipelineColumn
                                key={statusKey}
                                id={statusKey}
                                title={statusTitle}
                                cases={pipelineData.grouped[statusKey] || []}
                                onCardClick={handleOpenEditModal}
                                enableDrag={!isIndicator}
                                canIndicateCase={isIndicator}
                                onIndicateCase={handleOpenIndicationModal}
                            />
                        ))}
                    </div>
                </div>
                {/* Overlay opcional para feedback visual melhorado durante o arraste */}
                {/* <DragOverlay> ... </DragOverlay> */}
            </DndContext>
        </div>
    );
};

export default PipelinePage;
