import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
import styles from '../styles/UserManagement.module.css';
import { FaUserPlus, FaSync, FaEdit, FaTrash, FaPlus, FaTimes, FaSave, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
    'admin': { name: 'Administrador', color: '#9f7aea', textColor: '#FFFFFF' },
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
    const canManage = ['administrador', 'admin', 'supervisor'].includes(user?.role);

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- ESTADO DE PAGINAÇÃO (NOVO) ---
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

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'operador', department_id: '', status: 'ativo', area: ''
    });

    // Função de busca atualizada para aceitar paginação
    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const userParams = new URLSearchParams({ ...filters, page: page });
            
            const [usersRes, deptsRes] = await Promise.all([
                apiClient.get(`/users?${userParams.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                apiClient.get('/departments', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            // Backend agora retorna { data: [...], current_page: 1, ... }
            const responseData = usersRes.data;
            
            setUsers(responseData.data || []);
            setDepartments(deptsRes.data || []);

            // Atualiza paginação
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

    // Recarrega quando filtros mudam (volta pra pág 1)
    useEffect(() => {
        const timer = setTimeout(() => { fetchData(1); }, 300);
        return () => clearTimeout(timer);
    }, [filters, fetchData]); // Removemos fetchData do deps se ele não mudar, mas useCallback garante

    // Filtragem Frontend (Apenas para Área, já que Area não está no filtro backend ainda)
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

    // --- MANIPULAÇÃO DE DADOS ---
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
            fetchData(pagination.current_page); // Recarrega página atual
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
                {/* Agora usamos o TOTAL real do banco, não só os 15 da tela */}
                <KpiCard title="Total" value={pagination.total} />
                <KpiCard title="Na Tela" value={users.length} />
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
                    <option value="administrador">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="operador">Operador</option>
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
                {loading ? <p>Carregando...</p> : (
                    <>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Usuário</th><th>Função</th><th>Área</th><th>Depto</th><th>Status</th>
                                    {canManage && <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedUsers.map(user => (
                                    <tr key={user.id}>
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
                        
                        {/* --- CONTROLE DE PAGINAÇÃO --- */}
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

            {isUserFormModalOpen && (
                <div className={styles.modalOverlay}>
                    {/* Modal Form Content (Mesmo de antes) */}
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
                                        <option value="administrador">Admin</option>
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
