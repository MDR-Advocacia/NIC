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
    FaHandshake, // Ícone principal
    FaSun,
    FaMoon,
    FaShieldAlt 
} from 'react-icons/fa';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const getNavLinkClass = ({ isActive }) => {
        return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
    };

    const isAdmin = user?.role === 'admin';
    const isSupervisor = user?.role === 'supervisor';
    const canManageUsers = isAdmin || isSupervisor;

    return (
        <div className={styles.layoutContainer}>
            <aside className={styles.sidebar}>
                
                {/* --- NOVO LOGO NIC (Estilo Corporativo) --- */}
                <div className={styles.brandWrapper}>
                    {/* Parte 1: O Ícone Grande */}
                    {/* <FaHandshake className={styles.mainIcon} /> */}

                    {/* Parte 2: O Texto (NIC + Significado) */}
                    <div className={styles.textGroup}>
                        <h1 className={styles.nicTitle}>NIC</h1>
                        <div className={styles.meaningBox}>
                            <span>NÚCLEO</span>
                            <span>INTEGRADO DE</span>
                            <span>CONCILIAÇÕES</span>
                        </div>
                    </div>
                </div>
                {/* ------------------------------------------ */}

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

                        {canManageUsers && (
                            <li className={styles.navItem}>
                                <NavLink to="/users" className={getNavLinkClass}>
                                    <FaUsers /> <span>Gestão de Usuários</span>
                                </NavLink>
                            </li>
                        )}

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
                        <p style={{ fontSize: '10px', color: '#888' }}>
                            {user?.role?.toUpperCase()}
                        </p> 
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