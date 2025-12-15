// src/pages/PipelinePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import PipelineColumn from '../components/PipelineColumn';
import EditCaseModal from '../components/EditCaseModal';
import LitigantListModal from '../components/LitigantListModal'; // <--- IMPORT NOVO
import { 
    DndContext, 
    PointerSensor, 
    useSensor, 
    useSensors,
    closestCorners 
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import styles from '../styles/Pipeline.module.css';
import { FaExclamationTriangle, FaUsers } from 'react-icons/fa'; // <--- Import Icone

const PipelinePage = () => {
    const { token, user } = useAuth();

    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [lawyers, setLawyers] = useState([]);
    
    const [editingCase, setEditingCase] = useState(null);
    
    // --- NOVO ESTADO PARA O MODAL DE PARTES ---
    const [isLitigantModalOpen, setIsLitigantModalOpen] = useState(false); 

    const [filters, setFilters] = useState({});
    const [showDelayedOnly, setShowDelayedOnly] = useState(false);

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

            let fetchedCases = casesResponse.data;

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
            setError('Não foi possível carregar os dados do pipeline.');
        } finally {
            setLoading(false);
        }
    }, [token, groupCasesByStatus, filters, showDelayedOnly]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return; 

        const activeId = active.id;
        const overId = over.id;

        const movedCase = active.data.current.caseData;
        const sourceStatus = active.data.current.status;

        let destinationStatus;
        if (over.data.current?.status) {
            destinationStatus = over.data.current.status;
        } else {
            destinationStatus = over.id;
        }

        if (activeId === overId && sourceStatus === destinationStatus) return;

        setPipelineData(prevData => {
            const newGroupedData = { ...prevData.grouped };
            const sourceItems = newGroupedData[sourceStatus];
            const destinationItems = newGroupedData[destinationStatus];
            const oldIndex = sourceItems.findIndex(c => c.id === activeId);
            
            if (sourceStatus === destinationStatus) {
                const newIndex = destinationItems.findIndex(c => c.id === overId);
                if (newIndex === -1) return prevData; 
                newGroupedData[sourceStatus] = arrayMove(sourceItems, oldIndex, newIndex);
            } 
            else {
                newGroupedData[sourceStatus] = sourceItems.filter(c => c.id !== activeId);
                let newIndex = destinationItems.findIndex(c => c.id === overId);
                if (newIndex === -1) {
                    newIndex = destinationItems.length; 
                }
                newGroupedData[destinationStatus] = [
                    ...destinationItems.slice(0, newIndex),
                    { ...movedCase, status: destinationStatus },
                    ...destinationItems.slice(newIndex)
                ];
            }
            
            return { ...prevData, grouped: newGroupedData };
        });

        if (sourceStatus !== destinationStatus) {
            const updatedCaseData = { ...movedCase, status: destinationStatus, client_id: movedCase.client.id };
            apiClient.put(`/cases/${movedCase.id}`, updatedCaseData, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(err => {
                console.error("Erro ao atualizar o status do caso:", err);
                setError('Não foi possível salvar a alteração. Recarregando...');
                fetchAllData(); 
            });
        }
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
                    
                    {/* BOTÃO NOVO: GERENCIAR PARTES */}
                    <button 
                        onClick={() => setIsLitigantModalOpen(true)}
                        className={styles.secondaryButton} // Crie esse estilo ou use inline
                        style={{ 
                            backgroundColor: '#6366F1', color: 'white', border: 'none', 
                            padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px'
                        }}
                    >
                        <FaUsers /> Partes/Litigantes
                    </button>

                    <Link to="/cases/create" className={styles.newCaseButton}>
                        + Novo Caso
                    </Link>
                </div>
            </div>

            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label>Cliente</label>
                    <select
                        className={styles.filterSelect}
                        value={filters.client_id || ''}
                        onChange={(e) => handleFilterChange('client_id', e.target.value)}
                    >
                        <option value="">Todos</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                
                {user?.role === 'administrador' && (
                    <div className={styles.filterGroup}>
                        <label>Advogado</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.lawyer_id || ''}
                            onChange={(e) => handleFilterChange('lawyer_id', e.target.value)}
                        >
                            <option value="">Todos</option>
                            {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                        </select>
                    </div>
                )}
                
                <div className={styles.filterGroup}>
                    <label>Prioridade</label>
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

                <button 
                    className={`${styles.delayedFilterButton} ${showDelayedOnly ? styles.active : ''}`}
                    onClick={() => setShowDelayedOnly(!showDelayedOnly)}
                    title="Mostrar apenas casos parados há mais de 5 dias"
                >
                    <FaExclamationTriangle /> {showDelayedOnly ? 'Mostrando Atrasados' : 'Ver Atrasados'}
                </button>

            </div>

            {editingCase && <EditCaseModal legalCase={editingCase} onClose={handleCloseEditModal} onCaseUpdated={handleCaseUpdated} clients={clients} lawyers={lawyers} />}
            
            {/* --- MODAL DE LISTA DE PARTES --- */}
            <LitigantListModal 
                isOpen={isLitigantModalOpen}
                onClose={() => setIsLitigantModalOpen(false)}
            />
            {/* -------------------------------- */}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem' }}>
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
            </DndContext>
        </div>
    );
};

export default PipelinePage;