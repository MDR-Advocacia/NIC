import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/AggressorLawyersModal.module.css';
import { FaTimes, FaSearch, FaPlus, FaBook, FaEdit, FaTrash } from 'react-icons/fa';
import AddEditAggressorModal from './AddEditAggressorModal';

const AggressorLawyersModal = ({ isOpen, onClose }) => {
    const { token } = useAuth();
    const [aggressors, setAggressors] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingLawyer, setEditingLawyer] = useState(null);

    const fetchData = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            const [aggressorsResponse, clientsResponse] = await Promise.all([
                apiClient.get(`/aggressor-lawyers?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/clients', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            setAggressors(aggressorsResponse.data.data || []);
            setClients(clientsResponse.data || []);
        } catch (err) {
            setError('Não foi possível carregar os dados.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, isOpen, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleSaveSuccess = () => {
        setIsFormModalOpen(false);
        setEditingLawyer(null);
        fetchData();
    };

    const handleDelete = async (lawyerId) => {
        if (!window.confirm('Tem certeza que deseja excluir este advogado? Esta ação não pode ser desfeita.')) {
            return;
        }
        try {
            await apiClient.delete(`/aggressor-lawyers/${lawyerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert('Não foi possível excluir o advogado.');
            console.error(err);
        }
    };
    
    const handleOpenEditModal = (lawyer) => {
        setEditingLawyer(lawyer);
        setIsFormModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setEditingLawyer(null);
        setIsFormModalOpen(true);
    };

    if (!isOpen) {
        return null;
    }
    
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>Gerenciamento de Advogados Agressores</h2>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                </div>
                
                <div className={styles.modalBody}>
                    <p className={styles.modalDescription}>
                        Advogados agressores são aqueles que movem alto número de demandas e requerem parecer específico do banco antes de qualquer oferta de acordo.
                    </p>

                    <div className={styles.controls}>
                        <div className={styles.searchBar}>
                            <FaSearch />
                            <input 
                                type="text" 
                                placeholder="Buscar por nome ou OAB..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className={styles.addButton} onClick={handleOpenAddModal}>
                            <FaPlus /> Adicionar Advogado Agressor
                        </button>
                    </div>

                    <div className={styles.kpiGrid}>
                        <div className={styles.kpiCard}><span>Total de Advogados</span><strong>{aggressors.length}</strong></div>
                        <div className={styles.kpiCard}><span>Ativos</span><strong>{aggressors.filter(a => a.status === 'active').length}</strong></div>
                        <div className={styles.kpiCard}><span>Total de Demandas</span><strong>{aggressors.reduce((acc, a) => acc + (a.demands_quantity || 0), 0)}</strong></div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>OAB</th>
                                    <th>Bancos Afetados</th>
                                    <th>Demandas</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Carregando...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                                ) : aggressors.length > 0 ? (
                                    aggressors.map(lawyer => (
                                        <tr key={lawyer.id}>
                                            <td>{lawyer.name}</td>
                                            <td>{lawyer.oab}</td>
                                            <td>{lawyer.clients.map(c => c.name).join(', ')}</td>
                                            <td>{lawyer.demands_quantity}</td>
                                            <td>{lawyer.status === 'active' ? 'Ativo' : 'Inativo'}</td>
                                            <td className={styles.actionsCell}>
                                                <button title="Editar" onClick={() => handleOpenEditModal(lawyer)}>
                                                    <FaEdit />
                                                </button>
                                                <button title="Excluir" onClick={() => handleDelete(lawyer.id)}>
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                            Nenhum advogado agressor encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AddEditAggressorModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingLawyer(null);
                }}
                onSave={handleSaveSuccess}
                clients={clients}
                existingLawyer={editingLawyer}
            />
        </div>
    );
};

export default AggressorLawyersModal;