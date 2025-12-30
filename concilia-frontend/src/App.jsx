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



// Nossos Componentes de Layout/Proteção
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<UserProfile />} />
        <Route path="logs" element={<SystemLogsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="cases" element={<CaseManagementPage />} />
        <Route path="import" element={<ImportDataPage />} /> 
        <Route path="cases/create" element={<CaseCreatePage />} /> 
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="cases/:caseId/edit" element={<CaseEditPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
        <Route path="inbox/:conversationId" element={<ConversationDetailPage />} />
        
      </Route>
    </Routes>
  );
}

export default App;