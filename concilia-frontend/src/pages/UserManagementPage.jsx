import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/UserManagement.module.css';
import { 
    FaUserPlus, FaSync, FaEdit, FaTrash, FaPlus, FaTimes, FaSave, 
    FaChevronLeft, FaChevronRight, FaCheckSquare, FaBan, FaTrashAlt, FaUserTag,
    FaSearch, FaSlidersH, FaEraser, FaBuilding, FaKey
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import AddDepartmentModal from '../components/AddDepartmentModal';

const AREAS_LIST = ["Recuperação de Crédito", "Contencioso Passivo", "Atendente"];
const DEFAULT_RESET_PASSWORD = 'Mudar.123@';

const STATUS_DETAILS = {
    'ativo': { name: 'Ativo', color: '#38a169', textColor: '#FFFFFF' },
    'inativo': { name: 'Inativo', color: '#718096', textColor: '#FFFFFF' },
};
const ROLE_DETAILS = {
    'administrador': { name: 'Administrador', color: '#9f7aea', textColor: '#FFFFFF' },
    'supervisor': { name: 'Supervisor', color: '#ed8936', textColor: '#FFFFFF' },
    'operador': { name: 'Operador', color: '#4299e1', textColor: '#FFFFFF' },
    'indicador': { name: 'Indicador', color: '#2b6cb0', textColor: '#FFFFFF' },
};

const StatusTag = ({ status }) => {
    const s = STATUS_DETAILS[status] || { name: status, color: '#CBD5E0', textColor: '#1A202C' };
    return <span className={styles.tag} style={{ backgroundColor: s.color, color: s.textColor }}>{s.name}</span>;
};

const RoleTag = ({ role }) => {
    const r = ROLE_DETAILS[role] || { name: role, color: '#CBD5E0', textColor: '#1A202C' };
    return <span className={styles.tag} style={{ backgroundColor: r.color, color: r.textColor }}>{r.name}</span>;
};

const UserManagementPage = () => {
    const { token, user: loggedInUser } = useAuth();
    const canManage = ['administrador', 'supervisor'].includes(loggedInUser?.role);
    const canResetPasswords = ['administrador', 'admin'].includes(loggedInUser?.role);

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- PAGINAÇÃO ---
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });

    const [filters, setFilters] = useState({ search: '', status: '', role: '', department_id: '' });
    const [filterArea, setFilterArea] = useState('');

    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [isUserFormModalOpen, setIsUserFormModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // --- ESTADOS PARA AÇÕES EM LOTE ---
    const [selectedUsers, setSelectedUsers] = useState([]); // Array de IDs
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [showBatchRoleSelect, setShowBatchRoleSelect] = useState(false); // Para mostrar select de cargo na barra
    const [resettingUserId, setResettingUserId] = useState(null);

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'operador', department_id: '', status: 'ativo', area: ''
    });

    // Função de busca
    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        // Limpa seleção ao mudar de página ou recarregar para evitar erros
        setSelectedUsers([]); 
        try {
            const userParams = new URLSearchParams({ ...filters, page: page });
            
            const [usersRes, deptsRes] = await Promise.all([
                apiClient.get(`/users?${userParams.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/departments', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const responseData = usersRes.data;
            
            setUsers(responseData.data || []);
            setDepartments(deptsRes.data || []);

            setPagination({
                current_page: responseData.current_page || 1,
                last_page: responseData.last_page || 1,
                total: responseData.total || 0
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchData(1); }, 300);
        return () => clearTimeout(timer);
    }, [filters, fetchData]);

    // Filtragem Frontend (Área)
    const displayedUsers = useMemo(() => {
        if (!filterArea) return users; 
        return users.filter(user => user.area === filterArea);
    }, [users, filterArea]);

    const selectedDepartmentName = departments.find((department) => String(department.id) === String(filters.department_id))?.name;
    const roleLabelMap = {
        administrador: 'Administrador',
        supervisor: 'Supervisor',
        operador: 'Operador',
        indicador: 'Indicador',
    };
    const statusLabelMap = {
        ativo: 'Ativo',
        inativo: 'Inativo',
    };

    const activeFilterChips = [
        filters.search.trim() ? `Busca: ${filters.search.trim()}` : null,
        filters.status ? `Status: ${statusLabelMap[filters.status] || filters.status}` : null,
        filters.role ? `Função: ${roleLabelMap[filters.role] || filters.role}` : null,
        filters.department_id ? `Departamento: ${selectedDepartmentName || 'Selecionado'}` : null,
        filterArea ? `Área: ${filterArea}` : null,
    ].filter(Boolean);

    const activeFilterCount = activeFilterChips.length;

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        if (name === 'area') {
            setFilterArea(value); 
        } else {
            setFilters(prev => ({ ...prev, [name]: value })); 
        }
    };

    const handleClearFilters = () => {
        setFilters({ search: '', status: '', role: '', department_id: '' });
        setFilterArea('');
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            fetchData(newPage);
        }
    };

    // --- LÓGICA DE SELEÇÃO (CHECKBOXES) ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Seleciona todos os visíveis na tela
            const allIds = displayedUsers.map(u => u.id);
            setSelectedUsers(allIds);
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id) => {
        setSelectedUsers(prev => {
            if (prev.includes(id)) {
                return prev.filter(userId => userId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // --- LÓGICA DE AÇÕES EM LOTE (API) ---
    const handleBatchAction = async (action, value = null) => {
        if (!window.confirm(`Tem a certeza que deseja aplicar esta ação para ${selectedUsers.length} utilizadores?`)) return;

        setIsBatchProcessing(true);
        try {
            await apiClient.post('/users/batch-update', {
                user_ids: selectedUsers,
                action: action,
                value: value
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('Ação em lote realizada com sucesso!');
            fetchData(pagination.current_page); // Recarrega dados
            setSelectedUsers([]); // Limpa seleção
            setShowBatchRoleSelect(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao processar ação em lote. Verifique se tem permissão.');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    // --- CRUD INDIVIDUAL ---
    const handleOpenAddModal = () => {
        setIsEditing(false);
        setCurrentUserId(null);
        setFormData({ name: '', email: '', password: '', role: 'operador', department_id: '', status: 'ativo', area: '' });
        setIsUserFormModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setIsEditing(true);
        setCurrentUserId(user.id);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', 
            role: user.role,
            department_id: user.department_id || '',
            status: user.status || 'ativo',
            area: user.area || '' 
        });
        setIsUserFormModalOpen(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name, email: formData.email, role: formData.role,
                department_id: formData.department_id, status: formData.status, area: formData.area 
            };
            if (formData.password) payload.password = formData.password;
            else if (!isEditing) payload.password = '123456';

            if (isEditing) {
                await apiClient.put(`/users/${currentUserId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await apiClient.post('/users', payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsUserFormModalOpen(false);
            fetchData(pagination.current_page);
            alert(isEditing ? 'Atualizado!' : 'Criado!');
        } catch (err) {
            alert('Erro ao salvar.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Excluir usuário?')) {
            try {
                await apiClient.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchData(pagination.current_page);
            } catch (err) {
                alert("Erro ao excluir.");
            }
        }
    };

    const handleResetPassword = async (managedUser) => {
        if (!managedUser?.id) {
            return;
        }

        const confirmationMessage = `Resetar a senha de ${managedUser.name} para "${DEFAULT_RESET_PASSWORD}"?\n\nO usuário será desconectado e precisará trocar a senha no próximo login.`;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        setResettingUserId(managedUser.id);

        try {
            await apiClient.post(`/users/${managedUser.id}/reset-password`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            alert(`Senha de ${managedUser.name} resetada para ${DEFAULT_RESET_PASSWORD}.`);
            fetchData(pagination.current_page);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao resetar senha.');
        } finally {
            setResettingUserId(null);
        }
    };

    const getInitials = (n) => {
        if(!n) return ''; 
        const p = n.split(' '); 
        return (p[0][0] + (p.length>1?p[p.length-1][0]:'')).toUpperCase();
    };

    const handleSaveSuccess = () => { setIsDepartmentModalOpen(false); fetchData(pagination.current_page); };

    // Verifica se todos da página atual estão selecionados
    const isAllSelected = displayedUsers.length > 0 && displayedUsers.every(u => selectedUsers.includes(u.id));

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div><h1>Gestão de Usuários</h1><p>Controle de acesso e áreas</p></div>
                <div className={styles.headerActions}>
                    <button className={styles.actionButton} onClick={() => fetchData(pagination.current_page)}><FaSync /> Atualizar</button>
                    {canManage && (
                        <>
                            <button className={styles.actionButton} onClick={() => setIsDepartmentModalOpen(true)}><FaPlus/> Depto</button>
                            <button className={styles.newUserButton} onClick={handleOpenAddModal}><FaUserPlus /> Usuário</button>
                        </>
                    )}
                </div>
            </header>

            <section className={styles.kpiGrid}>
                <KpiCard title="Total" value={pagination.total} />
                <KpiCard title="Selecionados" value={selectedUsers.length} />
                <KpiCard title="Página" value={`${pagination.current_page}/${pagination.last_page}`} />
            </section>

            <section className={styles.filtersContainer}>
                <div className={styles.filtersHeader}>
                    <div className={styles.filtersTitleBlock}>
                        <div className={styles.filtersIcon}>
                            <FaSlidersH />
                        </div>
                        <div className={styles.filtersHeading}>
                            <h3>Filtros da Gestão de Usuários</h3>
                            <p>
                                Refine a operação por nome, status, função, departamento e área para administrar a equipe com mais clareza.
                            </p>
                        </div>
                    </div>
                    <span className={styles.filterCount}>
                        {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                    </span>
                </div>

                <div className={styles.filterGrid}>
                    <label className={`${styles.filterField} ${styles.searchField}`}>
                        <span className={styles.filterLabel}>
                            <FaSearch />
                            Buscar usuário
                        </span>
                        <input
                            type="text"
                            name="search"
                            placeholder="Nome, email ou informação relevante..."
                            className={styles.filterControl}
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaBan />
                            Status
                        </span>
                        <select name="status" className={styles.filterControl} value={filters.status} onChange={handleFilterChange}>
                            <option value="">Todos os status</option>
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaUserTag />
                            Função
                        </span>
                        <select name="role" className={styles.filterControl} value={filters.role} onChange={handleFilterChange}>
                            <option value="">Todas as funções</option>
                            <option value="administrador">Administrador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="operador">Operador</option>
                            <option value="indicador">Indicador</option>
                        </select>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaBuilding />
                            Departamento
                        </span>
                        <select name="department_id" className={styles.filterControl} value={filters.department_id} onChange={handleFilterChange}>
                            <option value="">Todos os departamentos</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </label>

                    <label className={styles.filterField}>
                        <span className={styles.filterLabel}>
                            <FaUserTag />
                            Área
                        </span>
                        <select name="area" className={styles.filterControl} value={filterArea} onChange={handleFilterChange}>
                            <option value="">Todas as áreas</option>
                            {AREAS_LIST.map(area => (<option key={area} value={area}>{area}</option>))}
                        </select>
                    </label>
                </div>

                <div className={styles.filtersFooter}>
                    <div className={styles.filtersSummary}>
                        {activeFilterCount > 0 ? (
                            activeFilterChips.map((chip) => (
                                <span key={chip} className={styles.filterChip}>
                                    {chip}
                                </span>
                            ))
                        ) : (
                            <span className={styles.filtersHint}>
                                A tabela está exibindo a visão completa da equipe nesta página.
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.clearFiltersButton}
                        onClick={handleClearFilters}
                        disabled={activeFilterCount === 0}
                    >
                        <FaEraser />
                        Limpar filtros
                    </button>
                </div>
            </section>

            <section className={styles.tableContainer}>
                {loading ? <p style={{padding:'20px'}}>Carregando...</p> : (
                    <>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    {/* CHECKBOX HEADER */}
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isAllSelected} 
                                            onChange={handleSelectAll}
                                            className={styles.checkboxInput}
                                        />
                                    </th>
                                    <th>Usuário</th><th>Função</th><th>Área</th><th>Depto</th><th>Status</th>
                                    {canManage && <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedUsers.map((managedUser) => (
                                    <tr key={managedUser.id} className={selectedUsers.includes(managedUser.id) ? styles.rowSelected : ''}>
                                        {/* CHECKBOX ROW */}
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(managedUser.id)}
                                                onChange={() => handleSelectUser(managedUser.id)}
                                                className={styles.checkboxInput}
                                            />
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.userAvatar}>{getInitials(managedUser.name)}</div>
                                                <div><div className={styles.userName}>{managedUser.name}</div><div className={styles.userEmail}>{managedUser.email}</div></div>
                                            </div>
                                        </td>
                                        <td><RoleTag role={managedUser.role} /></td>
                                        <td>{managedUser.area ? <span className={styles.tagArea}>{managedUser.area}</span> : <span style={{color:'#cbd5e1'}}>-</span>}</td>
                                        <td>{managedUser.department?.name || '-'}</td>
                                        <td><StatusTag status={managedUser.status} /></td>
                                        {canManage && (
                                            <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                                <div className={styles.rowActions}>
                                                    <button
                                                        type="button"
                                                        className={styles.actionIconButton}
                                                        title="Editar"
                                                        onClick={() => handleOpenEditModal(managedUser)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    {canResetPasswords && loggedInUser?.id !== managedUser.id && (
                                                        <button
                                                            type="button"
                                                            className={`${styles.actionIconButton} ${styles.actionIconButtonWarning}`}
                                                            title="Resetar senha para o padrão"
                                                            onClick={() => handleResetPassword(managedUser)}
                                                            disabled={resettingUserId === managedUser.id}
                                                        >
                                                            <FaKey />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={`${styles.actionIconButton} ${styles.actionIconButtonDanger}`}
                                                        title="Excluir"
                                                        onClick={() => handleDelete(managedUser.id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* PAGINAÇÃO */}
                        {pagination.last_page > 1 && (
                            <div className={styles.paginationFooter}>
                                <button 
                                    type="button"
                                    className={styles.paginationBtn}
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page === 1}
                                >
                                    <FaChevronLeft /> Anterior
                                </button>
                                <span className={styles.paginationPageInfo}>
                                    Página <strong>{pagination.current_page}</strong> de <strong>{pagination.last_page}</strong>
                                </span>
                                <button 
                                    type="button"
                                    className={styles.paginationBtn}
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page === pagination.last_page}
                                >
                                    Próxima <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* --- BARRA FLUTUANTE DE AÇÕES EM LOTE --- */}
            {selectedUsers.length > 0 && (
                <div className={styles.batchActionBar}>
                    <div className={styles.batchInfo}>
                        <strong>{selectedUsers.length}</strong> selecionado(s)
                    </div>
                    
                    <div className={styles.batchActions}>
                        {/* Ação: Ativar */}
                        <button 
                            className={`${styles.batchBtn} ${styles.btnSuccess}`} 
                            onClick={() => handleBatchAction('update_status', 1)} // 1 ou true para ativo
                            disabled={isBatchProcessing}
                        >
                            <FaCheckSquare /> Ativar
                        </button>

                        {/* Ação: Desativar */}
                        <button 
                            className={`${styles.batchBtn} ${styles.btnWarning}`} 
                            onClick={() => handleBatchAction('update_status', 0)} // 0 ou false para inativo
                            disabled={isBatchProcessing}
                        >
                            <FaBan /> Desativar
                        </button>
                        
                        {/* Ação: Mudar Cargo (Toggle Select) */}
                        {!showBatchRoleSelect ? (
                            <button 
                                className={`${styles.batchBtn} ${styles.btnInfo}`} 
                                onClick={() => setShowBatchRoleSelect(true)}
                                disabled={isBatchProcessing}
                            >
                                <FaUserTag /> Cargo
                            </button>
                        ) : (
                            <select 
                                className={styles.batchSelect}
                                onChange={(e) => handleBatchAction('update_role', e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Selecione...</option>
                                <option value="operador">Operador</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="administrador">Admin</option>
                                <option value="indicador">Indicador</option>
                            </select>
                        )}

                        {/* Ação: Excluir */}
                        <button 
                            className={`${styles.batchBtn} ${styles.btnDanger}`} 
                            onClick={() => handleBatchAction('delete')}
                            disabled={isBatchProcessing}
                        >
                            <FaTrashAlt /> Excluir
                        </button>

                        <button className={styles.batchClose} onClick={() => setSelectedUsers([])}><FaTimes /></button>
                    </div>
                </div>
            )}

            {isUserFormModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button className={styles.closeButton} onClick={() => setIsUserFormModalOpen(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSaveUser} className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Nome</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>E-mail</label>
                                <input required type="email" disabled={isEditing} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            {!isEditing && (
                                <div className={styles.formGroup}>
                                    <label>Senha</label>
                                    <input type="password" placeholder="Padrão: 123456" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                            )}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Função</label>
                                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="operador">Operador</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="administrador">Administrador</option>
                                        <option value="indicador">Indicador</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Área</label>
                                    <select required value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {AREAS_LIST.map(area => (<option key={area} value={area}>{area}</option>))}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Departamento</label>
                                    <select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                                        <option value="">Nenhum</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsUserFormModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}><FaSave /> Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <AddDepartmentModal isOpen={isDepartmentModalOpen} onClose={() => setIsDepartmentModalOpen(false)} onSave={handleSaveSuccess} />
        </div>
    );
};
export default UserManagementPage;
