// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import UserProfile from './pages/UserProfile';
import './App.css';

// Nossas Páginas
import SystemLogsPage from './pages/SystemLogsPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import CaseManagementPage from './pages/CaseManagementPage';
import ImportDataPage from './pages/ImportDataPage'; 
import CaseDetailPage from './pages/CaseDetailPage';
import CaseEditPage from './pages/CaseEditPage';
import CaseCreatePage from './pages/CaseCreatePage';
import UserManagementPage from './pages/UserManagementPage';
import InboxPage from './pages/InboxPage';
import ConversationDetailPage from './pages/ConversationDetailPage';
import ForceChangePassword from './pages/ForceChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GeneralBasePage from './pages/GeneralBasePage';
import {
  USER_ROLES,
  getDefaultRouteForRole,
} from './constants/access';



// Nossos Componentes de Layout/Proteção
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={getDefaultRouteForRole(user.role)} /> : <Navigate to="/login" />}
      />
      
      {/* --- ÁREA PÚBLICA (Qualquer um pode acessar) --- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/password-reset/:token" element={<ResetPassword />} />
      {/* ----------------------------------------------- */}
      
      {/* --- ÁREA PROTEGIDA (Só logado entra) --- */}
      <Route 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<UserProfile />} />
        <Route
          path="logs"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR]}>
              <SystemLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pipeline"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR, USER_ROLES.INDICADOR]}>
              <PipelinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cases"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR, USER_ROLES.INDICADOR]}>
              <CaseManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="import"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <ImportDataPage />
            </ProtectedRoute>
          }
        /> 
        <Route
          path="cases/create"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <CaseCreatePage />
            </ProtectedRoute>
          }
        /> 
        <Route
          path="cases/:caseId"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR, USER_ROLES.INDICADOR]}>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cases/:caseId/edit"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <CaseEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inbox"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <InboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inbox/:conversationId"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR, USER_ROLES.OPERADOR]}>
              <ConversationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="base-geral"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR]}>
              <GeneralBasePage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
