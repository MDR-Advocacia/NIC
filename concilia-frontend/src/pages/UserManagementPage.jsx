import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/UserManagement.module.css';
import { 
    FaUserPlus, FaSync, FaEdit, FaTrash, FaPlus, FaTimes, FaSave, 
    FaChevronLeft, FaChevronRight, FaCheckSquare, FaBan, FaTrashAlt, FaUserTag 
} from 'react-icons/fa';
import KpiCard from '../components/KpiCard';
import AddDepartmentModal from '../components/AddDepartmentModal';

const AREAS_LIST = ["Recuperação de Crédito", "Contencioso Passivo", "Atendente"];

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
    const { token, user } = useAuth();
    const canManage = ['administrador', 'supervisor'].includes(user?.role);

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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        if (name === 'area') {
            setFilterArea(value); 
        } else {
            setFilters(prev => ({ ...prev, [name]: value })); 
        }
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
                <input type="text" name="search" placeholder="Buscar..." className={styles.searchInput} value={filters.search} onChange={handleFilterChange} />
                <select name="status" className={styles.filterSelect} value={filters.status} onChange={handleFilterChange}>
                    <option value="">Status: Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                </select>
                <select name="role" className={styles.filterSelect} value={filters.role} onChange={handleFilterChange}>
                    <option value="">Função: Todas</option>
                    <option value="administrador">Administrador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="operador">Operador</option>
                    <option value="indicador">Indicador</option>
                </select>
                <select name="department_id" className={styles.filterSelect} value={filters.department_id} onChange={handleFilterChange}>
                    <option value="">Depto: Todos</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select name="area" className={styles.filterSelect} value={filterArea} onChange={handleFilterChange}>
                    <option value="">Área: Todas</option>
                    {AREAS_LIST.map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
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
                                {displayedUsers.map(user => (
                                    <tr key={user.id} className={selectedUsers.includes(user.id) ? styles.rowSelected : ''}>
                                        {/* CHECKBOX ROW */}
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                                className={styles.checkboxInput}
                                            />
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.userAvatar}>{getInitials(user.name)}</div>
                                                <div><div className={styles.userName}>{user.name}</div><div className={styles.userEmail}>{user.email}</div></div>
                                            </div>
                                        </td>
                                        <td><RoleTag role={user.role} /></td>
                                        <td>{user.area ? <span className={styles.tagArea}>{user.area}</span> : <span style={{color:'#cbd5e1'}}>-</span>}</td>
                                        <td>{user.department?.name || '-'}</td>
                                        <td><StatusTag status={user.status} /></td>
                                        {canManage && (
                                            <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <FaEdit title="Editar" size={18} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => handleOpenEditModal(user)} />
                                                    <FaTrash title="Excluir" size={18} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => handleDelete(user.id)} />
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* PAGINAÇÃO */}
                        {pagination.last_page > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '20px' }}>
                                <button 
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page === 1}
                                    style={{ padding: '8px 16px', cursor: 'pointer', opacity: pagination.current_page === 1 ? 0.5 : 1 }}
                                >
                                    <FaChevronLeft /> Anterior
                                </button>
                                <span style={{ color: '#64748b' }}>
                                    Página <strong>{pagination.current_page}</strong> de <strong>{pagination.last_page}</strong>
                                </span>
                                <button 
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page === pagination.last_page}
                                    style={{ padding: '8px 16px', cursor: 'pointer', opacity: pagination.current_page === pagination.last_page ? 0.5 : 1 }}
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
