import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './MainLayout.module.css';

import { 
    FaTachometerAlt, FaInbox, FaStream, FaSuitcase, 
    FaFileUpload, FaUsers, FaSignOutAlt, FaHandshake, 
    FaSun, FaMoon, FaShieldAlt 
} from 'react-icons/fa';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const getNavLinkClass = ({ isActive }) => {
        return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
    };

    const isAdmin = user?.role === 'administrador';
    const canManageUsers = user?.role === 'administrador' || user?.role === 'supervisor';

    return (
        <div className={styles.layoutContainer}>
            <aside className={styles.sidebar}>
                
                {/* --- LOGO NIC INTELIGENTE --- */}
                {/* Se o tema for 'light', adiciona a classe .brandLight */}
                <div className={`${styles.brandWrapper} ${theme === 'light' ? styles.brandLight : ''}`}>
                    {/* <FaHandshake className={styles.mainIcon} /> */}
                    
                    <div className={styles.textGroup}>
                        <h1 className={styles.nicTitle}>NIC</h1>
                        <div className={styles.meaningBox}>
                            <span>NÚCLEO</span>
                            <span>INTEGRADO DE</span>
                            <span>CONCILIAÇÕES</span>
                        </div>
                    </div>
                </div>
                {/* ---------------------------- */}

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
                            title="Mudar Tema"
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