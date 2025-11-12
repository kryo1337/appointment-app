import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] → ${config.method.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error('Error sending request:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    const duration = response.config.metadata?.startTime
      ? Date.now() - response.config.metadata.startTime
      : 'N/A';
    console.log(`[${timestamp}] ← ${response.config.method.toUpperCase()} ${response.config.url} ${response.status}`, {
      status: response.status,
      duration: duration !== 'N/A' ? `${duration}ms` : duration,
      data: response.data,
    });
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error response ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

export const peopleAPI = {
  getAll: () => api.get('/people'),
  getById: (id) => api.get(`/people/${id}`),
  create: (data) => api.post('/people', data),
  update: (id, data) => api.put(`/people/${id}`, data),
  delete: (id) => api.delete(`/people/${id}`),
};

export const availabilityAPI = {
  get: (personId) => api.get(`/people/${personId}/availability`),
  update: (personId, availability) => api.put(`/people/${personId}/availability`, { availability }),
};

export const slotsAPI = {
  find: (personIds, date, durationMinutes) => 
    api.post('/slots/find', {
      personIds,
      date,
      durationMinutes,
    }),
};

export const bookingsAPI = {
  getAll: (personIds) => {
    const params = personIds ? { personIds: personIds.join(',') } : {};
    return api.get('/bookings', { params });
  },
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  delete: (id) => api.delete(`/bookings/${id}`),
};

export default api;

