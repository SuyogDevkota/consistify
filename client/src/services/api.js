import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let csrfToken = null;
let csrfPromise = null;
let refreshPromise = null;

export async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = api.get('/csrf').then((res) => {
      csrfToken = res.data.data.csrfToken;
      return csrfToken;
    }).finally(() => {
      csrfPromise = null;
    });
  }
  return csrfPromise;
}

export function clearCsrf() {
  csrfToken = null;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh')
      .then(async (res) => {
        clearCsrf();
        await ensureCsrf();
        return res;
      })
      .catch((error) => {
        clearCsrf();
        if (error.response?.status === 401) {
          window.dispatchEvent(new Event('consistify:session-expired'));
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const csrfExempt = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some(
    (path) => config.url?.includes(path)
  );
  if (!csrfExempt && !['get', 'head', 'options'].includes(method)) {
    const token = await ensureCsrf();
    config.headers['x-csrf-token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      if (
        original.url?.includes('/auth/me') ||
        original.url?.includes('/auth/login') ||
        original.url?.includes('/auth/register') ||
        original.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }
    if (error.response?.status === 403 && error.response?.data?.error?.code === 'EBADCSRFTOKEN') {
      clearCsrf();
      try {
        await ensureCsrf();
        original.headers['x-csrf-token'] = csrfToken;
        return api(original);
      } catch {
        /* fall through */
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.message ||
    'Something went wrong'
  );
}

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (data) => api.patch('/auth/password', data),
  updateProfile: (data) => api.patch('/auth/profile', data),
  deleteAccount: (data) => api.delete('/auth/account', { data }),
};

export const notificationsApi = {
  list: (groupId) => api.get(`/notifications/${groupId}`),
  updatePreferences: (groupId, data) => api.put(`/notifications/${groupId}/preferences`, data),
  subscribe: (groupId, data) => api.post(`/notifications/${groupId}/subscriptions`, data),
  unsubscribe: (groupId, endpoint) =>
    api.delete(`/notifications/${groupId}/subscriptions`, { data: { endpoint } }),
  markRead: (groupId, notificationId) =>
    api.post(`/notifications/${groupId}/${notificationId}/read`),
  markAllRead: (groupId) => api.post(`/notifications/${groupId}/read-all`),
};

export const chatApi = {
  list: (groupId) => api.get(`/chat/${groupId}/messages`),
  send: (groupId, data) =>
    api.post(`/chat/${groupId}/messages`, data, {
      ...(data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
    }),
  mediaUrl: (groupId, messageId) =>
    new URL(`${API_URL}/chat/${groupId}/messages/${messageId}/media`, window.location.href).toString(),
  streamUrl: (groupId) =>
    new URL(`${API_URL}/chat/${groupId}/events`, window.location.href).toString(),
};

export const groupsApi = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  get: (id) => api.get(`/groups/${id}`),
  update: (id, data) => api.patch(`/groups/${id}`, data),
  remove: (id) => api.delete(`/groups/${id}`),
  leave: (id) => api.post(`/groups/${id}/leave`),
  join: (data) => api.post('/groups/join', data),
  validateInvite: (data) => api.post('/groups/invitations/validate', data),
  members: (id) => api.get(`/groups/${id}/members`),
  approveMember: (id, userId) => api.post(`/groups/${id}/members/${userId}/approve`),
  rejectMember: (id, userId) => api.post(`/groups/${id}/members/${userId}/reject`),
  changeRole: (id, userId, role) => api.patch(`/groups/${id}/members/${userId}/role`, { role }),
  transfer: (id, newOwnerUserId) =>
    api.post(`/groups/${id}/transfer-ownership`, { newOwnerUserId }),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  createInvite: (id, data) => api.post(`/groups/${id}/invitations`, data),
  listInvites: (id) => api.get(`/groups/${id}/invitations`),
  revokeInvite: (id, inviteId) => api.delete(`/groups/${id}/invitations/${inviteId}`),
  activity: (id, limit = 20) => api.get(`/groups/${id}/activity`, { params: { limit } }),
  categories: (id) => api.get(`/groups/${id}/categories`),
  createCategory: (id, data) => api.post(`/groups/${id}/categories`, data),
  updateCategory: (id, categoryId, data) =>
    api.patch(`/groups/${id}/categories/${categoryId}`, data),
  archiveCategory: (id, categoryId) => api.patch(`/groups/${id}/categories/${categoryId}`, { archived: true }),
  tasks: (id) => api.get(`/groups/${id}/tasks`),
  createTask: (id, data) => api.post(`/groups/${id}/tasks`, data),
  updateTask: (id, taskId, data) => api.patch(`/groups/${id}/tasks/${taskId}`, data),
  archiveTask: (id, taskId) => api.delete(`/groups/${id}/tasks/${taskId}`),
  checklist: (id, dateKey) => api.get(`/groups/${id}/checklist`, { params: { dateKey } }),
  complete: (id, taskId, data = {}) => api.post(`/groups/${id}/tasks/${taskId}/complete`, data),
  undo: (id, taskId, data = {}) => api.post(`/groups/${id}/tasks/${taskId}/undo`, data),
  history: (id, params) => api.get(`/groups/${id}/history`, { params }),
  summary: (id) => api.get(`/groups/${id}/analytics/summary`),
  daily: (id, range = 7) => api.get(`/groups/${id}/analytics/daily`, { params: { range } }),
  cumulative: (id, range = 7) =>
    api.get(`/groups/${id}/analytics/cumulative`, { params: { range } }),
  leaderboard: (id, period = 'all') =>
    api.get(`/groups/${id}/analytics/leaderboard`, { params: { period } }),
  categoryStats: (id, range = 30) =>
    api.get(`/groups/${id}/analytics/categories`, { params: { range } }),
  calendar: (id, year, month) =>
    api.get(`/groups/${id}/analytics/calendar`, { params: { year, month } }),
};
