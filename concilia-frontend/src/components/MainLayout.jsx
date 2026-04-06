import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/MainLayout.module.css';
import { FaUserCog } from 'react-icons/fa';
import {
    canAccessDashboard,
    canAccessGeneralBase,
    canAccessImport,
    canAccessInbox,
    canAccessLogs,
    canManageUsers,
    isIndicatorRole,
} from '../constants/access';
import {
    FaTachometerAlt, FaInbox, FaStream, FaSuitcase,
    FaFileUpload, FaUsers, FaSignOutAlt, FaHandshake,
    FaSun, FaMoon, FaShieldAlt, FaDatabase, FaChevronDown, FaCog
} from 'react-icons/fa';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    const getNavLinkClass = ({ isActive }) => {
        return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
    };

    const isAdmin = canAccessLogs(user?.role);
    const canManageUsersSection = canManageUsers(user?.role);
    const pipelineLabel = isIndicatorRole(user?.role) ? 'Indicações' : 'Pipeline de Acordos';
    const configRoutes = ['/cases', '/import', '/base-geral', '/users', '/logs'];
    const isConfigSectionActive = configRoutes.some((route) => location.pathname.startsWith(route));
    const [isConfigOpen, setIsConfigOpen] = useState(isConfigSectionActive);

    useEffect(() => {
        if (isConfigSectionActive) {
            setIsConfigOpen(true);
        }
    }, [isConfigSectionActive]);

    const hasConfigSection = Boolean(user);

    const configButtonClass = [
        styles.navLink,
        styles.submenuToggle,
        isConfigSectionActive ? styles.navLinkActive : '',
    ].filter(Boolean).join(' ');

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
                        
                        {canAccessDashboard(user?.role) && (
                            <li className={styles.navItem}>
                                <NavLink to="/dashboard" className={getNavLinkClass}>
                                    <FaTachometerAlt /> <span>Dashboard</span>
                                </NavLink>
                            </li>
                        )}
                        {canAccessInbox(user?.role) && (
                            <li className={styles.navItem}>
                                <NavLink to="/inbox" className={getNavLinkClass}>
                                    <FaInbox /> <span>Caixa de Entrada</span>
                                </NavLink>
                            </li>
                        )}
                        <li className={styles.navItem}>
                            <NavLink to="/pipeline" className={getNavLinkClass}>
                                <FaStream /> <span>{pipelineLabel}</span>
                            </NavLink>
                        </li>
                        {hasConfigSection && (
                            <li className={`${styles.navItem} ${styles.submenuItem}`}>
                                <button
                                    type="button"
                                    className={configButtonClass}
                                    onClick={() => setIsConfigOpen((current) => !current)}
                                    aria-expanded={isConfigOpen}
                                >
                                    <span className={styles.submenuLabel}>
                                        <FaCog /> <span>Configurações</span>
                                    </span>
                                    <FaChevronDown className={`${styles.submenuChevron} ${isConfigOpen ? styles.submenuChevronOpen : ''}`} />
                                </button>

                                {isConfigOpen && (
                                    <ul className={styles.submenuList}>
                                        <li className={styles.submenuListItem}>
                                            <NavLink to="/cases" className={({ isActive }) => `${styles.navLink} ${styles.submenuLink} ${isActive ? styles.navLinkActive : ''}`}>
                                                <FaSuitcase /> <span>Gestão de Casos</span>
                                            </NavLink>
                                        </li>

                                        {canAccessImport(user?.role) && (
                                            <li className={styles.submenuListItem}>
                                                <NavLink to="/import" className={({ isActive }) => `${styles.navLink} ${styles.submenuLink} ${isActive ? styles.navLinkActive : ''}`}>
                                                    <FaFileUpload /> <span>Importar Dados</span>
                                                </NavLink>
                                            </li>
                                        )}

                                        {canAccessGeneralBase(user?.role) && (
                                            <li className={styles.submenuListItem}>
                                                <NavLink to="/base-geral" className={({ isActive }) => `${styles.navLink} ${styles.submenuLink} ${isActive ? styles.navLinkActive : ''}`}>
                                                    <FaDatabase /> <span>Base Geral</span>
                                                </NavLink>
                                            </li>
                                        )}

                                        {canManageUsersSection && (
                                            <li className={styles.submenuListItem}>
                                                <NavLink to="/users" className={({ isActive }) => `${styles.navLink} ${styles.submenuLink} ${isActive ? styles.navLinkActive : ''}`}>
                                                    <FaUsers /> <span>Gestão de Usuários</span>
                                                </NavLink>
                                            </li>
                                        )}

                                        {isAdmin && (
                                            <li className={styles.submenuListItem}>
                                                <NavLink to="/logs" className={({ isActive }) => `${styles.navLink} ${styles.submenuLink} ${isActive ? styles.navLinkActive : ''}`}>
                                                    <FaShieldAlt /> <span>Auditoria / Logs</span>
                                                </NavLink>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}
                        <li className={styles.navItem}>
                            <NavLink to="/profile" className={getNavLinkClass}>
                                <FaUserCog /> <span>Meu Perfil</span>
                            </NavLink>
                        </li>
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
