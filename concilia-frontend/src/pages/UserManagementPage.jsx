// src/pages/UserManagementPage.jsx
// ATUALIZADO: Lógica de cores das tags movida para o JSX

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/UserManagement.module.css';
import { FaUserPlus, FaSync, FaFileExport, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import AddEditUserModal from '../components/AddEditUserModal';
import AddDepartmentModal from '../components/AddDepartmentModal';

// --- COMPONENTES AUXILIARES (LÓGICA DE COR ATUALIZADA) ---

// Mapa de Status
const STATUS_DETAILS = {
    'ativo': { name: 'Ativo', color: '#38a169', textColor: '#FFFFFF' },
    'inativo': { name: 'Inativo', color: '#718096', textColor: '#FFFFFF' },
};
// Mapa de Funções (Role)
const ROLE_DETAILS = {
    'administrador': { name: 'Administrador', color: '#9f7aea', textColor: '#FFFFFF' },
    'supervisor': { name: 'Supervisor', color: '#ed8936', textColor: '#FFFFFF' },
    'operador': { name: 'Operador', color: '#4299e1', textColor: '#FFFFFF' },
};

const StatusTag = ({ status }) => {
    const currentStatus = STATUS_DETAILS[status] || { 
        name: status, 
        color: '#A0AEC0', // Cinza padrão
        textColor: '#1A202C'
    };
    return (
        <span 
            className={styles.tag} 
            style={{ 
                backgroundColor: currentStatus.color, 
                color: currentStatus.textColor 
            }}
        >
            {currentStatus.name}
        </span>
    );
};
const RoleTag = ({ role }) => {
    const currentRole = ROLE_DETAILS[role] || { 
        name: role, 
        color: '#A0AEC0',
        textColor: '#1A202C'
    };
    return (
        <span 
            className={styles.tag} 
            style={{ 
                backgroundColor: currentRole.color, 
                color: currentRole.textColor 
            }}
        >
            {currentRole.name}
        </span>
    );
};


const UserManagementPage = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUserFormModalOpen, setIsUserFormModalOpen] = useState(false);
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [filters, setFilters] = useState({
        search: '', status: '', role: '', department_id: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const userParams = new URLSearchParams(filters);
            const [usersResponse, departmentsResponse] = await Promise.all([
                apiClient.get(`/users?${userParams.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/departments', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(usersResponse.data.data || []);
            setDepartments(departmentsResponse.data || []);
        } catch (err) {
            setError('Não foi possível carregar os dados.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchData(); }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const getInitials = (name) => {
        if (!name) return '';
        const names = name.split(' ');
        const firstInitial = names[0]?.[0] || '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };
    
    const handleSaveSuccess = () => {
        setIsUserFormModalOpen(false);
        setIsDepartmentModalOpen(false);
        setEditingUser(null);
        fetchData();
    };
    
    const handleDelete = async (userId) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }
        try {
            await apiClient.delete(`/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert('Não foi possível excluir o usuário.');
            console.error(err);
        }
    };

    const handleOpenAddModal = () => {
        setEditingUser(null);
        setIsUserFormModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        setIsUserFormModalOpen(true);
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1>Gestão de Usuários</h1>
                    <p>Gerencie usuários, permissões e controle de acesso</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.actionButton}><FaFileExport /> Exportar</button>
                    <button className={styles.actionButton} onClick={fetchData}><FaSync /> Atualizar</button>
                    <button className={styles.actionButton} onClick={() => setIsDepartmentModalOpen(true)}>
                        <FaPlus/> Novo Departamento
                    </button>
                    <button className={styles.newUserButton} onClick={handleOpenAddModal}>
                        <FaUserPlus /> Novo Usuário
                    </button>
                </div>
            </header>

            <section className={styles.kpiGrid}>
                {/* O KpiCard já foi refatorado e usará as variáveis CSS */}
                <KpiCard title="Total de Usuários" value={users.length.toString()} />
                <KpiCard title="Usuários Ativos" value={users.filter(u => u.status === 'ativo').length.toString()} />
                <KpiCard title="Primeiro Login" value={"-"} /> 
                <KpiCard title="Departamentos" value={departments.length.toString()} />
            </section>

            <section className={styles.filtersContainer}>
                <input 
                    type="text" 
                    name="search"
                    placeholder="Buscar usuários..." 
                    className={styles.searchInput}
                    value={filters.search}
                    onChange={handleFilterChange}
                />
                <select name="status" className={styles.filterSelect} value={filters.status} onChange={handleFilterChange}>
                    <option value="">Todos os status</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                </select>
                <select name="role" className={styles.filterSelect} value={filters.role} onChange={handleFilterChange}>
                    <option value="">Todas as funções</option>
                    <option value="administrador">Administrador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="operador">Operador</option>
                </select>
                <select name="department_id" className={styles.filterSelect} value={filters.department_id} onChange={handleFilterChange}>
                    <option value="">Todos os departamentos</option>
                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
            </section>
            
            <section className={styles.tableContainer}>
                <h3>Lista de Usuários ({users.length})</h3>
                {loading ? <p>Carregando...</p> : error ? <p style={{color: 'red'}}>{error}</p> : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Contato</th>
                                <th>Função</th>
                                <th>Departamento</th>
                                <th>Último Login</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.userAvatar}>{getInitials(user.name)}</div>
                                            <div>
                                                <div className={styles.userName}>{user.name}</div>
                                                <div className={styles.userEmail}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.phone || '-'}</td>
                                    {/* ATUALIZADO: Usa o novo componente RoleTag */}
                                    <td><RoleTag role={user.role} /></td>
                                    <td>{user.department?.name || '-'}</td>
                                    <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'Nunca'}</td>
                                    {/* ATUALIZADO: Usa o novo componente StatusTag */}
                                    <td><StatusTag status={user.status} /></td>
                                    <td className={styles.actionsCell}>
                                        <FaEdit title="Editar" onClick={() => handleOpenEditModal(user)} />
                                        <FaTrash title="Excluir" onClick={() => handleDelete(user.id)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <AddEditUserModal
                isOpen={isUserFormModalOpen}
                onClose={() => {
                    setIsUserFormModalOpen(false);
                    setEditingUser(null);
                }}
                onSave={handleSaveSuccess}
                departments={departments}
                existingUser={editingUser}
            />

            <AddDepartmentModal
                isOpen={isDepartmentModalOpen}
                onClose={() => setIsDepartmentModalOpen(false)}
                onSave={handleSaveSuccess}
            />
        </div>
    );
};

export default UserManagementPage;