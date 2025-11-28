// src/components/MainLayout.jsx
// ATUALIZADO: Correção do ícone de Auditoria e estrutura do menu

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './MainLayout.module.css';

import { 
    FaTachometerAlt, 
    FaInbox, 
    FaStream, 
    FaSuitcase, 
    FaFileUpload, 
    FaUsers, 
    FaSignOutAlt,
    FaHandshake,
    FaSun,
    FaMoon,
    FaShieldAlt // 1. ADICIONADO: Importação que faltava
} from 'react-icons/fa';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const getNavLinkClass = ({ isActive }) => {
        return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
    };

    // Verifica se o usuário tem permissão para ver menus administrativos
    const canManageUsers = user?.role !== 'operador';
    const isAdmin = user?.role === 'administrador';

    return (
        <div className={styles.layoutContainer}>
            <aside className={styles.sidebar}>
                <h2><FaHandshake /> <span>Concil.IA</span></h2>
                <nav>
                    <ul className={styles.navList}>
                        <li className={styles.navItem}>
                            <NavLink to="/dashboard" className={getNavLinkClass}>
                                <FaTachometerAlt /> <span>Dashboard</span>
                            </NavLink>
                        </li>
                        <li className={styles.navItem}>
                            <NavLink to="/inbox" className={getNavLinkClass}>
                                <FaInbox /> <span>Caixa de Entrada</span>
                            </NavLink>
                        </li>
                        <li className={styles.navItem}>
                            <NavLink to="/pipeline" className={getNavLinkClass}>
                                <FaStream /> <span>Pipeline de Acordos</span>
                            </NavLink>
                        </li>
                        <li className={styles.navItem}>
                            <NavLink to="/cases" className={getNavLinkClass}>
                                <FaSuitcase /> <span>Gestão de Casos</span>
                            </NavLink>
                        </li>
                        <li className={styles.navItem}>
                            <NavLink to="/import" className={getNavLinkClass}>
                                <FaFileUpload /> <span>Importar Dados</span>
                            </NavLink>
                        </li>

                        {/* Lógica para Gestão de Usuários */}
                        {canManageUsers && (
                            <li className={styles.navItem}>
                                <NavLink to="/users" className={getNavLinkClass}>
                                    <FaUsers /> <span>Gestão de Usuários</span>
                                </NavLink>
                            </li>
                        )}

                        {/* 2. CORRIGIDO: O link de Auditoria agora está DENTRO da lista <ul> */}
                        {isAdmin && (
                            <li className={styles.navItem}>
                                <NavLink to="/logs" className={getNavLinkClass}>
                                    <FaShieldAlt /> <span>Auditoria / Logs</span>
                                </NavLink>
                            </li>
                        )}
                    </ul>
                </nav>

                <div className={styles.footer}>
                    <div className={styles.userInfo}>
                        <p>{user?.name}</p>
                        <button 
                            className={styles.themeToggleButton} 
                            onClick={toggleTheme}
                            title={theme === 'light' ? 'Mudar para Modo Noturno' : 'Mudar para Modo Claro'}
                        >
                            {theme === 'light' ? <FaMoon /> : <FaSun />}
                        </button>
                    </div>
                    <button onClick={logout} className={styles.logoutButton}>
                        <FaSignOutAlt /> <span>Sair</span>
                    </button>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;