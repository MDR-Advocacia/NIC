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
import { FaExclamationTriangle } from 'react-icons/fa';

const PipelinePage = () => {
    const { token, user } = useAuth();

    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    
    const [editingCase, setEditingCase] = useState(null);
    const [filters, setFilters] = useState({});
    const [showDelayedOnly, setShowDelayedOnly] = useState(false);
    const [activeId, setActiveId] = useState(null); // Rastreia item sendo arrastado

    const handleOpenEditModal = (caseToEdit) => setEditingCase(caseToEdit);
    const handleCloseEditModal = () => setEditingCase(null);

    const handleCaseUpdated = () => {
        fetchAllData();
    };

    const groupCasesByStatus = useCallback((cases) => {
        const initialGroups = {
            'initial_analysis': 'Análise Inicial', 'proposal_sent': 'Proposta Enviada',
            'in_negotiation': 'Em Negociação', 'awaiting_draft': 'Aguardando Minuta',
            'closed_deal': 'Acordo Fechado', 'failed_deal': 'Acordo Frustrado',
        };
        const grouped = Object.keys(initialGroups).reduce((acc, key) => ({ ...acc, [key]: [] }), {});
        (cases || []).forEach(currentCase => {
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
            const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));

            const [casesResponse, clientsResponse, lawyersResponse] = await Promise.all([
                apiClient.get(`/cases?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            let fetchedCases = Array.isArray(casesResponse.data) ? casesResponse.data : (casesResponse.data.data || []);

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
            setLawyers(lawyersResponse.data.data || []);
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
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over?.id);

        if (
            !activeContainer ||
            !overContainer ||
            (activeContainer === overContainer && active.id === over.id)
        ) {
            setActiveId(null);
            return;
        }

        // Recupera o card movido do estado atualizado
        const movedCase = pipelineData.grouped[overContainer].find(c => String(c.id) === String(active.id));
        
        // Verifica se houve mudança real de coluna para chamar API
        if (movedCase && movedCase.status !== overContainer) {
            // Prepara payload limpo
            const updatedCasePayload = { 
                ...movedCase, 
                status: overContainer,
                client_id: movedCase.client?.id || movedCase.client_id,
                lawyer_id: movedCase.lawyer?.id || movedCase.lawyer_id,
                plaintiff_id: movedCase.plaintiff?.id || movedCase.plaintiff_id,
                defendant_id: movedCase.defendant?.id || movedCase.defendant_id,
                opposing_lawyer_id: movedCase.opposing_lawyer?.id || movedCase.opposing_lawyer_id
            };

            // Limpeza de objetos
            delete updatedCasePayload.client;
            delete updatedCasePayload.lawyer;
            delete updatedCasePayload.plaintiff;
            delete updatedCasePayload.defendant;
            delete updatedCasePayload.opposing_lawyer;

            // Atualiza status localmente no objeto para persistir na UI
            setPipelineData((prev) => {
                const newGrouped = { ...prev.grouped };
                const items = [...newGrouped[overContainer]];
                const index = items.findIndex(c => String(c.id) === String(active.id));
                if (index !== -1) {
                    items[index] = { ...items[index], status: overContainer };
                    newGrouped[overContainer] = items;
                }
                return { ...prev, grouped: newGrouped };
            });

            // Chama API
            apiClient.put(`/cases/${movedCase.id}`, updatedCasePayload, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(err => {
                console.error("Erro ao atualizar status:", err);
                setError('Erro ao salvar alteração. Revertendo...');
                fetchAllData();
            });
        } 
        else if (activeContainer === overContainer) {
            // Apenas reordenação na mesma coluna
            const activeIndex = pipelineData.grouped[activeContainer].findIndex((i) => String(i.id) === String(active.id));
            const overIndex = pipelineData.grouped[overContainer].findIndex((i) => String(i.id) === String(over.id));

            if (activeIndex !== overIndex) {
                setPipelineData((prev) => ({
                    ...prev,
                    grouped: {
                        ...prev.grouped,
                        [activeContainer]: arrayMove(prev.grouped[activeContainer], activeIndex, overIndex),
                    },
                }));
            }
        }

        setActiveId(null);
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    if (loading && !pipelineData) return <p>Carregando pipeline...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <div className={styles.header}>
                <h1>Pipeline de Acordos</h1>
                <div className={styles.headerActions}>
                    <Link to="/cases/create" className={styles.newCaseButton}>
                        + Novo Caso
                    </Link>
                </div>
            </div>

            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label>Cliente</label>
                    <select className={styles.filterSelect} value={filters.client_id || ''} onChange={(e) => handleFilterChange('client_id', e.target.value)}>
                        <option value="">Todos</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                
                {user?.role === 'administrador' && (
                    <div className={styles.filterGroup}>
                        <label>Advogado</label>
                        <select className={styles.filterSelect} value={filters.lawyer_id || ''} onChange={(e) => handleFilterChange('lawyer_id', e.target.value)}>
                            <option value="">Todos</option>
                            {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                        </select>
                    </div>
                )}
                
                <div className={styles.filterGroup}>
                    <label>Prioridade</label>
                    <select className={styles.filterSelect} value={filters.priority || ''} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                        <option value="">Todas</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>

                <button 
                    className={`${styles.delayedFilterButton} ${showDelayedOnly ? styles.active : ''}`}
                    onClick={() => setShowDelayedOnly(!showDelayedOnly)}
                    title="Mostrar apenas casos parados há mais de 5 dias"
                >
                    <FaExclamationTriangle /> {showDelayedOnly ? 'Mostrando Atrasados' : 'Ver Atrasados'}
                </button>
            </div>

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
            
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', paddingBottom: '100px' }}>
                    {pipelineData?.titles && Object.entries(pipelineData.titles).map(([statusKey, statusTitle]) => (
                        <PipelineColumn 
                            key={statusKey} 
                            id={statusKey} 
                            title={statusTitle} 
                            cases={pipelineData.grouped[statusKey] || []} 
                            onCardClick={handleOpenEditModal} 
                        />
                    ))}
                </div>
                {/* Overlay opcional para feedback visual melhorado durante o arraste */}
                {/* <DragOverlay> ... </DragOverlay> */}
            </DndContext>
        </div>
    );
};

export default PipelinePage;