// src/pages/PipelinePage.jsx
// ATUALIZADO: Implementação completa de DragOver para suportar colunas vazias

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import PipelineColumn from '../components/PipelineColumn';
import EditCaseModal from '../components/EditCaseModal';
import TagMultiSelect from '../components/TagMultiSelect';
import ContraIndicationReasonModal from '../components/ContraIndicationReasonModal';
import FailedDealReasonModal from '../components/FailedDealReasonModal';
import ReanalysisReasonModal from '../components/ReanalysisReasonModal';
import AgreementFieldsModal from '../components/AgreementFieldsModal';
import ResponsibleMultiSelect from '../components/ResponsibleMultiSelect';
import SingleSelect from '../components/SingleSelect';
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
    FaEye,
    FaEyeSlash,
    FaBolt,
    FaTag,
    FaFileExport,
    FaInfoCircle,
} from 'react-icons/fa';
import {
    LEGAL_CASE_STATUS_DETAILS,
    LEGAL_CASE_STATUS_ORDER,
    POST_AGREEMENT_STATUS_ORDER,
    UNASSIGNED_RESPONSIBLE_VALUE,
    isTerminalLegalCaseStatus,
} from '../constants/legalCaseStatus';
import { 
    canAccessCaseCreation,
    isIndicatorRole,
    normalizeUserRole,
} from '../constants/access';
import IndicationChecklistModal from '../components/IndicationChecklistModal';
import { useToast } from '../context/ToastContext';
import {
    downloadCasesWorkbook,
    fetchAllCasesForExport,
    isDelayedCaseForExport,
    sortCasesByUpdatedAtDesc,
} from '../utils/caseExport';

const MAX_API_PAGE_SIZE = 200;
const REANALYSIS_STATUSES = ['contra_indicated', 'failed_deal'];
const INITIAL_FILTERS = {
    search: '',
    action_object: '',
    client_id: '',
    lawyer_ids: [],
    indicator_user_id: '',
    priority: '',
    tags: [],
};

const buildQueryParams = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item !== undefined && item !== null && item !== '') {
                    query.append(`${key}[]`, item);
                }
            });
            return;
        }

        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });

    return query;
};

const fetchAllPaginatedResults = async (endpoint, token, params = {}) => {
    const items = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
        const query = buildQueryParams({
            ...params,
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
    const toast = useToast();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const isIndicator = isIndicatorRole(user?.role);
    const canChooseResponsible = true;
    const canChooseIndicator = true;
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
    const [searchParams] = useSearchParams();
    const pipelineView = searchParams.get('view') || 'pre';
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedActionObject, setDebouncedActionObject] = useState('');
    const [showDelayedOnly, setShowDelayedOnly] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [contraIndicationPrompt, setContraIndicationPrompt] = useState(null);
    const [contraIndicationReason, setContraIndicationReason] = useState('');
    const [contraIndicationError, setContraIndicationError] = useState('');
    const [isSavingContraIndication, setIsSavingContraIndication] = useState(false);
    const [failedDealPrompt, setFailedDealPrompt] = useState(null);
    const [failedDealReason, setFailedDealReason] = useState('');
    const [failedDealError, setFailedDealError] = useState('');
    const [isSavingFailedDeal, setIsSavingFailedDeal] = useState(false);
    const [reanalysisPrompt, setReanalysisPrompt] = useState(null);
    const [reanalysisReason, setReanalysisReason] = useState('');
    const [reanalysisError, setReanalysisError] = useState('');
    const [isSavingReanalysis, setIsSavingReanalysis] = useState(false);
    const [agreementPrompt, setAgreementPrompt] = useState(null);
    const [agreementValue, setAgreementValue] = useState('');
    const [agreementClosedAt, setAgreementClosedAt] = useState('');
    const [agreementError, setAgreementError] = useState('');
    const [isSavingAgreement, setIsSavingAgreement] = useState(false);

    const searchTerm = filters.search.trim();
    const actionObjectFilter = filters.action_object.trim();
    const clientFilter = filters.client_id || '';
    const selectedLawyerIds = useMemo(
        () => (Array.isArray(filters.lawyer_ids) ? filters.lawyer_ids.map(String) : []),
        [filters.lawyer_ids]
    );
    const indicatorFilter = canChooseIndicator ? (filters.indicator_user_id || '') : '';
    const priorityFilter = filters.priority || '';
    const tagFilters = Array.isArray(filters.tags) ? filters.tags : [];
    const selectedClientName = clients.find((client) => String(client.id) === String(filters.client_id))?.name;
    const selectedLawyerNames = selectedLawyerIds
        .map((lawyerId) => {
            if (lawyerId === UNASSIGNED_RESPONSIBLE_VALUE) {
                return 'Sem responsável';
            }

            return lawyers.find((lawyer) => String(lawyer.id) === String(lawyerId))?.name;
        })
        .filter(Boolean);
    const selectedLawyerFilterLabel = (() => {
        if (selectedLawyerNames.length === 0) {
            return null;
        }

        if (selectedLawyerNames.length <= 2) {
            return selectedLawyerNames.join(' + ');
        }

        return `${selectedLawyerNames.slice(0, 2).join(' + ')} + ${selectedLawyerNames.length - 2}`;
    })();
    const selectedIndicatorName = indicators.find((indicator) => String(indicator.id) === String(filters.indicator_user_id))?.name;
    const selectedTagLabel = (() => {
        if (tagFilters.length === 0) return null;
        if (tagFilters.length === 1) return `Etiqueta: ${tagFilters[0]}`;
        if (tagFilters.length === 2) return `Etiquetas: ${tagFilters.join(' + ')}`;
        return `Etiquetas: ${tagFilters.length} selecionadas`;
    })();
    const priorityLabelMap = {
        baixa: 'Prioridade baixa',
        media: 'Prioridade média',
        alta: 'Prioridade alta',
    };
    const [showFilterChips, setShowFilterChips] = useState(false);

    const activeFilterChips = [
        searchTerm ? `Busca: ${searchTerm}` : null,
        actionObjectFilter ? `Causa de pedir: ${actionObjectFilter}` : null,
        selectedClientName ? `Cliente: ${selectedClientName}` : null,
        selectedLawyerFilterLabel ? `Responsáveis: ${selectedLawyerFilterLabel}` : null,
        selectedIndicatorName ? `Indicador: ${selectedIndicatorName}` : null,
        filters.priority ? priorityLabelMap[filters.priority] : null,
        selectedTagLabel,
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

    const handleOpenReanalysisModal = (caseToReanalyze) => {
        if (!caseToReanalyze?.id || !REANALYSIS_STATUSES.includes(caseToReanalyze.status)) {
            return;
        }

        setReanalysisPrompt(caseToReanalyze);
        setReanalysisReason('');
        setReanalysisError('');
    };

    const handleCancelReanalysis = () => {
        setReanalysisPrompt(null);
        setReanalysisReason('');
        setReanalysisError('');
        setIsSavingReanalysis(false);
    };

    const handleConfirmReanalysis = async (event) => {
        event.preventDefault();

        const normalizedReason = reanalysisReason.trim();
        if (!normalizedReason) {
            setReanalysisError('Informe o motivo da reanálise.');
            return;
        }

        if (!reanalysisPrompt?.id) return;

        setIsSavingReanalysis(true);
        setReanalysisError('');

        try {
            await apiClient.post(
                `/cases/${reanalysisPrompt.id}/request-reanalysis`,
                { reanalysis_reason: normalizedReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReanalysisPrompt(null);
            setReanalysisReason('');
            fetchAllData();
        } catch (err) {
            console.error('Erro ao solicitar reanálise:', err);
            const firstBackendError = Object.values(err.response?.data?.errors || {})[0]?.[0];
            setReanalysisError(firstBackendError || err.response?.data?.message || 'Não foi possível solicitar a reanálise.');
        } finally {
            setIsSavingReanalysis(false);
        }
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

    const groupCasesByStatus = useCallback((cases, statusOrder = LEGAL_CASE_STATUS_ORDER) => {
        const initialGroups = statusOrder.reduce((acc, statusKey) => {
            acc[statusKey] = LEGAL_CASE_STATUS_DETAILS[statusKey]?.name || statusKey;
            return acc;
        }, {});
        const grouped = Object.keys(initialGroups).reduce((acc, key) => ({ ...acc, [key]: [] }), {});
        [...(cases || [])]
            .sort((firstCase, secondCase) => new Date(secondCase.updated_at) - new Date(firstCase.updated_at))
            .forEach(currentCase => {
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
                lawyer_ids: selectedLawyerIds,
                indicator_user_id: indicatorFilter,
                priority: priorityFilter,
                tags: tagFilters,
            };

            const validResponsibleValues = selectedLawyerIds.filter((lawyerId) =>
                lawyerId === UNASSIGNED_RESPONSIBLE_VALUE
                || fetchedLawyers.some((lawyer) => String(lawyer.id) === String(lawyerId))
            );

            if (validResponsibleValues.length !== selectedLawyerIds.length) {
                effectiveFilters.lawyer_ids = validResponsibleValues;
                setFilters((currentFilters) => {
                    const currentValues = Array.isArray(currentFilters.lawyer_ids) ? currentFilters.lawyer_ids.map(String) : [];

                    if (currentValues.length === validResponsibleValues.length) {
                        return currentFilters;
                    }

                    return { ...currentFilters, lawyer_ids: validResponsibleValues };
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

            const fetchParams = {
                ...effectiveFilters,
                sort_by: 'updated_at',
                sort_order: 'desc',
            };

            // Filter by statuses based on pipeline view
            if (pipelineView === 'post') {
                fetchParams.statuses = POST_AGREEMENT_STATUS_ORDER;
            } else {
                fetchParams.statuses = LEGAL_CASE_STATUS_ORDER;
            }

            let fetchedCases = await fetchAllPaginatedResults('/cases', token, fetchParams);

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

            const groupedCases = pipelineView === 'post'
                ? groupCasesByStatus(fetchedCases, POST_AGREEMENT_STATUS_ORDER)
                : groupCasesByStatus(fetchedCases, LEGAL_CASE_STATUS_ORDER);
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
    }, [token, groupCasesByStatus, clientFilter, selectedLawyerIds, indicatorFilter, priorityFilter, tagFilters, debouncedSearch, debouncedActionObject, showDelayedOnly, canChooseIndicator, pipelineView]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        setPipelineData(null);
    }, [pipelineView]);

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

    const buildStatusUpdatePayload = (movedCase, targetStatus, extraPayload = {}) => {
        const updatedCasePayload = {
            ...movedCase,
            status: targetStatus,
            client_id: movedCase.client?.id || movedCase.client_id,
            lawyer_id: movedCase.lawyer?.id || movedCase.lawyer_id,
            plaintiff_id: movedCase.plaintiff?.id || movedCase.plaintiff_id,
            defendant_id: movedCase.defendant?.id || movedCase.defendant_id,
            opposing_lawyer_id: movedCase.opposing_lawyer?.id || movedCase.opposing_lawyer_id,
            ...extraPayload,
        };

        delete updatedCasePayload.client;
        delete updatedCasePayload.lawyer;
        delete updatedCasePayload.indicator;
        delete updatedCasePayload.contra_indicated_by;
        delete updatedCasePayload.reanalysis_requested_by;
        delete updatedCasePayload.plaintiff;
        delete updatedCasePayload.defendant;
        delete updatedCasePayload.opposing_lawyer;

        return updatedCasePayload;
    };

    const updateCaseStatusLocally = (caseId, targetStatus, extraFields = {}) => {
        setPipelineData((prev) => {
            if (!prev?.grouped) return prev;

            const newGrouped = { ...prev.grouped };
            const listContainer = Object.keys(newGrouped).find((key) =>
                newGrouped[key].some((item) => String(item.id) === String(caseId))
            );

            if (!listContainer) return prev;

            const items = [...newGrouped[listContainer]];
            const itemIndex = items.findIndex((item) => String(item.id) === String(caseId));

            if (itemIndex === -1) return prev;

            items[itemIndex] = {
                ...items[itemIndex],
                ...extraFields,
                status: targetStatus,
            };
            newGrouped[listContainer] = items;

            return { ...prev, grouped: newGrouped };
        });
    };

    const persistCaseStatusChange = async (movedCase, targetStatus, extraPayload = {}) => {
        console.log(`Movendo card ${movedCase.id}: ${movedCase.status} -> ${targetStatus}`);

        const updatedCasePayload = buildStatusUpdatePayload(movedCase, targetStatus, extraPayload);
        updateCaseStatusLocally(movedCase.id, targetStatus, extraPayload);

        try {
            await apiClient.put(`/cases/${movedCase.id}`, updatedCasePayload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Status salvo com sucesso no backend.');
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            fetchAllData();
            throw err;
        }
    };

    const handleCancelContraIndication = () => {
        setContraIndicationPrompt(null);
        setContraIndicationReason('');
        setContraIndicationError('');
        setIsSavingContraIndication(false);
        fetchAllData();
    };

    const handleConfirmContraIndication = async (event) => {
        event.preventDefault();

        const normalizedReason = contraIndicationReason.trim();
        if (!normalizedReason) {
            setContraIndicationError('Informe o motivo da contraindicação.');
            return;
        }

        if (!contraIndicationPrompt?.legalCase) return;

        setIsSavingContraIndication(true);
        setContraIndicationError('');

        try {
            await persistCaseStatusChange(
                contraIndicationPrompt.legalCase,
                contraIndicationPrompt.targetStatus,
                { contra_indication_reason: normalizedReason }
            );
            setContraIndicationPrompt(null);
            setContraIndicationReason('');
        } catch (err) {
            const firstBackendError = Object.values(err.response?.data?.errors || {})[0]?.[0];
            setContraIndicationError(firstBackendError || err.response?.data?.message || 'Não foi possível salvar a contraindicação.');
        } finally {
            setIsSavingContraIndication(false);
        }
    };

    const handleCancelFailedDeal = () => {
        setFailedDealPrompt(null);
        setFailedDealReason('');
        setFailedDealError('');
        setIsSavingFailedDeal(false);
        fetchAllData();
    };

    const handleConfirmFailedDeal = async (event) => {
        event.preventDefault();

        const normalizedReason = failedDealReason.trim();
        if (!normalizedReason) {
            setFailedDealError('Informe o motivo do acordo frustrado.');
            return;
        }

        if (!failedDealPrompt?.legalCase) return;

        setIsSavingFailedDeal(true);
        setFailedDealError('');

        try {
            await persistCaseStatusChange(
                failedDealPrompt.legalCase,
                failedDealPrompt.targetStatus,
                { failed_deal_reason: normalizedReason }
            );
            setFailedDealPrompt(null);
            setFailedDealReason('');
        } catch (err) {
            const firstBackendError = Object.values(err.response?.data?.errors || {})[0]?.[0];
            setFailedDealError(firstBackendError || err.response?.data?.message || 'Não foi possível salvar o motivo.');
        } finally {
            setIsSavingFailedDeal(false);
        }
    };


    const handleCancelAgreement = () => {
        setAgreementPrompt(null);
        setAgreementValue('');
        setAgreementClosedAt('');
        setAgreementError('');
        setIsSavingAgreement(false);
        fetchAllData();
    };

    const handleConfirmAgreement = async (event) => {
        event.preventDefault();

        const numericValue = parseFloat(agreementValue);
        if (!numericValue || numericValue <= 0) {
            setAgreementError('Informe um valor de acordo válido.');
            return;
        }
        if (!agreementClosedAt) {
            setAgreementError('Informe a data do acordo.');
            return;
        }

        if (!agreementPrompt?.legalCase) return;

        setIsSavingAgreement(true);
        setAgreementError('');

        try {
            await persistCaseStatusChange(
                agreementPrompt.legalCase,
                agreementPrompt.targetStatus,
                { agreement_value: numericValue, agreement_closed_at: agreementClosedAt }
            );
            setAgreementPrompt(null);
            setAgreementValue('');
            setAgreementClosedAt('');
        } catch (err) {
            const firstBackendError = Object.values(err.response?.data?.errors || {})[0]?.[0];
            setAgreementError(firstBackendError || err.response?.data?.message || 'Não foi possível salvar os dados do acordo.');
        } finally {
            setIsSavingAgreement(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        // 1. Se soltou fora de qualquer lugar válido, cancela
        if (!over) {
            return;
        }

        const overId = over.id;
        // Onde o card foi solto (Nova Coluna)
        const overContainer = findContainer(overId);
        
        // Onde o card está agora na memória do React (pode já ser a nova coluna por causa do DragOver)
        const currentContainerOfItem = findContainer(active.id);

        if (!overContainer || !currentContainerOfItem) {
            return;
        }

        // 2. Encontra o objeto do caso (Card) na lista atual
        const movedCase = pipelineData.grouped[currentContainerOfItem].find(
            (c) => String(c.id) === String(active.id)
        );

        if (!movedCase) {
            return;
        }

        // 3. A CORREÇÃO PRINCIPAL:
        // Compara o status REAL do banco (movedCase.status) com a coluna de destino (overContainer).
        // Se forem diferentes, houve troca de fase, independente da animação visual.
        const isStatusChange = movedCase.status !== overContainer;

        if (isStatusChange) {
            if (overContainer === 'contra_indicated') {
                setContraIndicationPrompt({
                    legalCase: movedCase,
                    targetStatus: overContainer,
                });
                setContraIndicationReason(movedCase.contra_indication_reason || '');
                setContraIndicationError('');
                return;
            }

            if (overContainer === 'failed_deal') {
                setFailedDealPrompt({
                    legalCase: movedCase,
                    targetStatus: overContainer,
                });
                setFailedDealReason(movedCase.failed_deal_reason || '');
                setFailedDealError('');
                return;
            }

            if (overContainer === 'closed_deal' || overContainer === 'closed_in_hearing') {
                setAgreementPrompt({
                    legalCase: movedCase,
                    targetStatus: overContainer,
                });
                setAgreementValue(movedCase.agreement_value || '');
                setAgreementClosedAt(movedCase.agreement_closed_at ? movedCase.agreement_closed_at.slice(0, 10) : '');
                setAgreementError('');
                return;
            }

            persistCaseStatusChange(movedCase, overContainer).catch(() => {});
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

    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleTagFilterChange = (newTags) => {
        setFilters((prev) => ({ ...prev, tags: newTags }));
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
            const deletedText = (tagToDelete.text || tagToDelete.name || '').toLocaleLowerCase('pt-BR');
            setFilters((prev) => ({
                ...prev,
                tags: (prev.tags || []).filter((t) => (typeof t === 'string' ? t : '').toLocaleLowerCase('pt-BR') !== deletedText),
            }));
            toast.success(response.data?.message || 'Etiqueta excluída com sucesso.');
            fetchAllData();
        } catch (err) {
            console.error('Erro ao excluir etiqueta salva:', err);
            toast.error(err.response?.data?.message || 'Não foi possível excluir a etiqueta.');
        }
    };

    const handleExportPipelineCases = async () => {
        if (!token || isExporting) {
            return;
        }

        setIsExporting(true);

        try {
            const exportFilters = {
                search: searchTerm,
                action_object: actionObjectFilter,
                client_id: clientFilter,
                lawyer_ids: selectedLawyerIds,
                indicator_user_id: indicatorFilter,
                priority: priorityFilter,
                tags: tagFilters,
                sort_by: 'updated_at',
                sort_order: 'desc',
            };

            const exportedCases = await fetchAllCasesForExport(exportFilters, token);

            const visibleExportCases = showDelayedOnly
                ? exportedCases.filter((legalCase) => isDelayedCaseForExport(legalCase))
                : exportedCases;

            downloadCasesWorkbook(sortCasesByUpdatedAtDesc(visibleExportCases), {
                filePrefix: 'pipeline-casos',
                sheetName: 'Pipeline',
            });
        } catch (err) {
            console.error('Erro ao exportar pipeline:', err);
            toast.error('Não foi possível exportar a planilha do pipeline.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({ ...INITIAL_FILTERS });
        setShowDelayedOnly(false);
    };

    const postAgreementTooltips = {
        pending_obf: 'Obrigação de Fazer',
    };

    const boardContent = (
        <div className={styles.boardShell}>
            <div className={styles.boardGrid}>
                {pipelineData?.titles && Object.entries(pipelineData.titles).map(([statusKey, statusTitle]) => (
                    <PipelineColumn
                        key={statusKey}
                        id={statusKey}
                        title={statusTitle}
                        titleTooltip={postAgreementTooltips[statusKey]}
                        cases={pipelineData.grouped[statusKey] || []}
                        onCardClick={handleOpenCase}
                        enableDrag={pipelineView === 'pre' && !isIndicator}
                        canIndicateCase={pipelineView === 'pre' && isIndicator}
                        onIndicateCase={handleOpenIndicationModal}
                        canRequestReanalysis={pipelineView === 'pre' && isIndicator}
                        onRequestReanalysis={handleOpenReanalysisModal}
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
                <h1>{isIndicator ? 'Indicações e Acompanhamento' : pipelineView === 'post' ? 'Pipeline Pós-Acordo' : 'Pipeline de Acordos'}</h1>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.exportButton}
                        onClick={handleExportPipelineCases}
                        disabled={isExporting}
                    >
                        <FaFileExport />
                        {isExporting ? 'Exportando...' : 'Exportar Excel'}
                    </button>
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
                                    ? 'Visualize todos os cards do pipeline e indique somente os casos que ainda estão em Análise Inicial.'
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
                        <SingleSelect
                            options={clients}
                            value={clientFilter}
                            onChange={(v) => handleFilterChange('client_id', v)}
                            emptyOptionLabel="Todos"
                            searchPlaceholder="Buscar cliente"
                            emptyMessage="Nenhum cliente encontrado."
                            ariaLabel="Filtro de cliente"
                        />
                    </div>
                    
                    {canChooseResponsible && (
                        <div className={styles.filterField}>
                            <label className={styles.filterFieldLabel}>
                                <FaUserTie />
                                <span>Responsável do Caso</span>
                            </label>
                            <ResponsibleMultiSelect
                                selectedValues={selectedLawyerIds}
                                options={lawyers}
                                onChange={(values) => setFilters((prev) => ({ ...prev, lawyer_ids: values }))}
                                unassignedValue={UNASSIGNED_RESPONSIBLE_VALUE}
                            />
                        </div>
                    )}

                    {canChooseIndicator && (
                        <div className={styles.filterField}>
                            <label className={styles.filterFieldLabel}>
                                <FaUserTag />
                                <span>Indicador</span>
                            </label>
                            <SingleSelect
                                options={indicators}
                                value={indicatorFilter}
                                onChange={(v) => handleFilterChange('indicator_user_id', v)}
                                emptyOptionLabel="Todos"
                                searchPlaceholder="Buscar indicador"
                                emptyMessage="Nenhum indicador encontrado."
                                ariaLabel="Filtro de indicador"
                            />
                        </div>
                    )}
                    
                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaSignal />
                            <span>Prioridade</span>
                        </label>
                        <SingleSelect
                            options={[
                                { value: 'baixa', label: 'Baixa' },
                                { value: 'media', label: 'Média' },
                                { value: 'alta', label: 'Alta' },
                            ]}
                            value={priorityFilter}
                            onChange={(v) => handleFilterChange('priority', v)}
                            emptyOptionLabel="Todas"
                            ariaLabel="Filtro de prioridade"
                        />
                    </div>

                    <div className={styles.filterField}>
                        <label className={styles.filterFieldLabel}>
                            <FaTag />
                            <span>Etiquetas</span>
                        </label>
                        <TagMultiSelect
                            tags={savedTags}
                            selectedValues={filters.tags}
                            onChange={handleTagFilterChange}
                            onDelete={handleDeleteSavedTag}
                            canDelete={canManageSavedTags}
                        />
                    </div>
                </div>

                <div className={styles.filterPanelFooter}>
                    <div className={styles.filterFooterLeft}>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                className={styles.chipsSpoilerToggle}
                                onClick={() => setShowFilterChips((v) => !v)}
                            >
                                {showFilterChips ? <FaEyeSlash /> : <FaEye />}
                                {showFilterChips ? 'Ocultar filtros ativos' : `Ver filtros ativos (${activeFilterCount})`}
                            </button>
                        )}
                        {showFilterChips && activeFilterCount > 0 && (
                            <div className={styles.filterSummary}>
                                {activeFilterChips.map((chip) => (
                                    <span
                                        key={chip}
                                        className={`${styles.filterChip} ${chip.includes('Atrasados') || chip.includes('atrasados') ? styles.filterChipAlert : ''}`}
                                    >
                                        {chip}
                                    </span>
                                ))}
                            </div>
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
                    Todos os cards do pipeline ficam visíveis para acompanhamento. A indicação continua disponível apenas nos casos em Análise Inicial.
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

            {contraIndicationPrompt && (
                <ContraIndicationReasonModal
                    caseNumber={contraIndicationPrompt.legalCase?.case_number}
                    reason={contraIndicationReason}
                    onReasonChange={setContraIndicationReason}
                    error={contraIndicationError}
                    isSubmitting={isSavingContraIndication}
                    onCancel={handleCancelContraIndication}
                    onConfirm={handleConfirmContraIndication}
                />
            )}

            {failedDealPrompt && (
                <FailedDealReasonModal
                    caseNumber={failedDealPrompt.legalCase?.case_number}
                    reason={failedDealReason}
                    onReasonChange={setFailedDealReason}
                    error={failedDealError}
                    isSubmitting={isSavingFailedDeal}
                    onCancel={handleCancelFailedDeal}
                    onConfirm={handleConfirmFailedDeal}
                />
            )}

            {reanalysisPrompt && (
                <ReanalysisReasonModal
                    caseNumber={reanalysisPrompt.case_number}
                    reason={reanalysisReason}
                    onReasonChange={setReanalysisReason}
                    error={reanalysisError}
                    isSubmitting={isSavingReanalysis}
                    onCancel={handleCancelReanalysis}
                    onConfirm={handleConfirmReanalysis}
                />
            )}

            {agreementPrompt && (
                <AgreementFieldsModal
                    caseNumber={agreementPrompt.legalCase?.case_number}
                    agreementValue={agreementValue}
                    onValueChange={setAgreementValue}
                    agreementClosedAt={agreementClosedAt}
                    onDateChange={setAgreementClosedAt}
                    error={agreementError}
                    isSubmitting={isSavingAgreement}
                    onCancel={handleCancelAgreement}
                    onConfirm={handleConfirmAgreement}
                />
            )}

            {isIndicator ? (
                boardContent
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
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
