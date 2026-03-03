// src/api.js
import axios from 'axios';

// Detecta se está rodando localmente ou em produção (ajuste a URL conforme seu ambiente)
// Se você usa Vite, pode usar import.meta.env.VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8123/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para adicionar o token em todas as requisições
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros de resposta (ex: token expirado)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Opcional: Redirecionar para login ou limpar storage
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Atalhos para recursos comuns
export const authApi = {
  login: (credentials) => apiClient.post('/login', credentials),
  logout: () => apiClient.post('/logout'),
  me: () => apiClient.get('/user'),
};

export const casesApi = {
  getAll: (params) => apiClient.get('/cases', { params }),
  get: (id) => apiClient.get(`/cases/${id}`),
  create: (data) => apiClient.post('/cases', data),
  update: (id, data) => apiClient.put(`/cases/${id}`, data),
  delete: (id) => apiClient.delete(`/cases/${id}`),
  history: (id) => apiClient.get(`/cases/${id}/history`),
  export: (params) => apiClient.get('/cases/export', { params, responseType: 'blob' }),
};

// --- ADICIONADO AQUI ---
export const litigantsApi = {
    getAll: (params) => apiClient.get('/litigants', { params }),
    create: (data) => apiClient.post('/litigants', data),
    update: (id, data) => apiClient.put(`/litigants/${id}`, data),
    delete: (id) => apiClient.delete(`/litigants/${id}`),
};
// Função para buscar conversas filtradas (Minhas, Não Atribuídas, Todas)
export const getConversations = (assigneeType = 'all') => {
  return api.get(`/chat/conversations?assignee_type=${assigneeType}`);
};

// Função para buscar os canais (Inboxes/Caixas de entrada)
export const getInboxes = () => {
  return api.get('/chat/inboxes');
};
// -----------------------

export default apiClient;