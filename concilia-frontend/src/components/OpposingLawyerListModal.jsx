import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Modal.module.css';
import { FaSearch, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

const OpposingLawyerListModal = ({ onClose, onSelect }) => {
    const { token } = useAuth();
    const [lawyers, setLawyers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Carregar advogados (com debounce de 500ms na busca)
    const fetchLawyers = async (search = '') => {
        setLoading(true);
        try {
            const params = search ? `?search=${search}` : '';
            const response = await apiClient.get(`/opposing-lawyers${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLawyers(response.data);
        } catch (error) {
            console.error("Erro ao buscar advogados:", error);
        } finally {
            setLoading(false);
        }
    };

    // Efeito para busca: espera 0.5s após parar de digitar
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchLawyers(searchTerm);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, token]);

    const toggleAbusive = async (lawyer) => {
        // Atualização Otimista (muda na tela antes do servidor responder para parecer instantâneo)
        const newStatus = !lawyer.is_abusive;
        setLawyers(prev => prev.map(l => l.id === lawyer.id ? { ...l, is_abusive: newStatus } : l));

        try {
            await apiClient.put(`/opposing-lawyers/${lawyer.id}`, 
                { is_abusive: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao salvar alteração. Revertendo...");
            // Reverte em caso de erro
            setLawyers(prev => prev.map(l => l.id === lawyer.id ? { ...l, is_abusive: !newStatus } : l));
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '750px' }}>
                <div className={styles.header}>
                    <h2>Selecionar Advogado Adverso</h2>
                    <button onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>

                {/* Campo de Busca */}
                <div className={styles.formGroup} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                    <input 
                        type="text" 
                        className={styles.input} 
                        placeholder="Buscar por nome, OAB ou CPF..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.8rem' }}
                        autoFocus
                    />
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)', fontSize: '1.1rem' }} />
                </div>

                {/* Lista de Resultados */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border-color-light)', borderRadius: '16px', background: 'var(--surface-card-sunken)' }}>
                    {loading ? (
                        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando lista...</p>
                    ) : lawyers.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                            <thead style={{ background: 'var(--surface-card-muted)', position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--card-shadow)' }}>
                                <tr>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid var(--border-color-light)', width: '50%' }}>Advogado</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'center', borderBottom: '1px solid var(--border-color-light)', width: '30%' }}>Classificação</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)', width: '20%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lawyers.map(lawyer => (
                                    <tr key={lawyer.id} style={{ 
                                        borderBottom: '1px solid var(--border-color-light)', 
                                        backgroundColor: lawyer.is_abusive ? 'var(--danger-soft)' : 'transparent',
                                        transition: 'background-color 0.2s'
                                    }}>
                                        <td style={{ padding: '12px 15px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {lawyer.name}
                                                {lawyer.is_abusive && <FaExclamationTriangle color="var(--danger-primary)" title="Litigante Abusivo" size={14} />}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                {lawyer.oab ? `OAB: ${lawyer.oab}` : 'S/ OAB'} • {lawyer.cpf ? `CPF: ${lawyer.cpf}` : 'S/ CPF'}
                                            </div>
                                        </td>
                                        
                                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {/* TOGGLE SWITCH */}
                                                <label className={styles.switch} title="Marcar como Litigante Abusivo">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!lawyer.is_abusive} 
                                                        onChange={() => toggleAbusive(lawyer)}
                                                    />
                                                    <span className={styles.slider}></span>
                                                </label>
                                                <span className={`${styles.switchLabel} ${lawyer.is_abusive ? styles.active : ''}`}>
                                                    {lawyer.is_abusive ? 'Abusivo' : 'Normal'}
                                                </span>
                                            </div>
                                        </td>

                                        <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => { onSelect(lawyer); onClose(); }}
                                                className={styles.saveButton}
                                                style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <FaCheck /> Usar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: '10px', fontSize: '1.1rem' }}>Nenhum advogado encontrado.</p>
                            <p style={{ fontSize: '0.9rem' }}>Tente outro termo ou cadastre um novo.</p>
                        </div>
                    )}
                </div>

                <div className={styles.footer} style={{ marginTop: '1.5rem', borderTop: 'none' }}>
                    <button onClick={onClose} className={styles.cancelButton}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default OpposingLawyerListModal;
