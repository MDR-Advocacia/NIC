import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8123/api';
const AUTH_STORAGE_KEY = 'authToken';
const USER_STORAGE_KEY = 'user';

export const getStoredAuthToken = () => {
  const rawToken = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawToken) return null;

  const normalizedToken = rawToken.replace(/^"+|"+$/g, '').trim();

  if (normalizedToken && normalizedToken !== rawToken) {
    localStorage.setItem(AUTH_STORAGE_KEY, normalizedToken);
  }

  return normalizedToken || null;
};

export const clearStoredAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || '').includes('/login')) {
      clearStoredAuthSession();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return Promise.reject(error);
  }
);

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

export const litigantsApi = {
  getAll: (params) => apiClient.get('/litigants', { params }),
  create: (data) => apiClient.post('/litigants', data),
  update: (id, data) => apiClient.put(`/litigants/${id}`, data),
  delete: (id) => apiClient.delete(`/litigants/${id}`),
};

export const getConversations = (assigneeType = 'all') => {
  return apiClient.get(`/chat/conversations?assignee_type=${assigneeType}`);
};

export const getInboxes = () => {
  return apiClient.get('/chat/inboxes');
};

export default apiClient;
