import axios from 'axios';

const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const cacheStore = new Map();

const getCached = async (key, ttlMs, fetcher) => {
  const now = Date.now();
  const cached = cacheStore.get(key);
  if (cached?.value && now - cached.time < ttlMs) {
    return cached.value;
  }
  if (cached?.promise) {
    return cached.promise;
  }
  const promise = fetcher()
    .then((value) => {
      cacheStore.set(key, { value, time: Date.now() });
      return value;
    })
    .finally(() => {
      const latest = cacheStore.get(key);
      if (latest?.promise) {
        cacheStore.delete(key);
      }
    });
  cacheStore.set(key, { promise });
  return promise;
};

const clearCache = (key) => {
  cacheStore.delete(key);
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on token expiration or invalidity
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (phone, password) => {
    const response = await api.post('/auth/login', { phone, password });
    return response.data; // Expected response: { token, user }
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data; // Expected response: { token, user }
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateMe: async (userData) => {
    const response = await api.patch('/auth/me', userData);
    return response.data;
  }
};

export const clinicianAPI = {
  getStats: async () => {
    return getCached('clinician:stats', 15000, async () => {
      const response = await api.get('/api/clinician/stats');
      return response.data;
    });
  },
  getAlerts: async () => {
    return getCached('clinician:alerts', 8000, async () => {
      const response = await api.get('/api/clinician/alerts');
      return response.data;
    });
  },
  dismissAlert: async (alertId) => {
    const response = await api.patch(`/api/clinician/alerts/${alertId}/dismiss`);
    clearCache('clinician:alerts');
    clearCache('clinician:stats');
    return response.data;
  },
  listPatients: async () => {
    const response = await api.get('/api/clinician/patients');
    return response.data;
  },
  getPatientsOverview: async (limit = 8) => {
    return getCached(`clinician:overview:${limit}`, 12000, async () => {
      const response = await api.get('/api/clinician/patients/overview', {
        params: { limit },
      });
      return response.data;
    });
  },
  getPatientSummary: async (patientId) => {
    const response = await api.get(`/api/clinician/patients/${patientId}/summary`);
    return response.data;
  }
};

export const communityAPI = {
  listGroups: async (category) => {
    const response = await api.get('/api/community/groups', {
      params: category ? { category } : undefined,
    });
    return response.data;
  }
};

export const nutritionAPI = {
  createPlan: async (payload) => {
    const response = await api.post('/api/nutrition/plans', payload);
    return response.data;
  },
  listPlans: async (userId) => {
    const response = await api.get(`/api/nutrition/plans/${userId}`);
    return response.data;
  }
};

export const sosAPI = {
  getContacts: async () => {
    const response = await api.get('/api/sos/contacts');
    return response.data;
  },
  getPersonalContacts: async (userId) => {
    const response = await api.get(`/api/sos/contacts/personal/${userId}`);
    return response.data;
  },
  triggerSOS: async (payload) => {
    const response = await api.post('/api/sos/trigger', payload);
    return response.data;
  }
};

export const ppdAPI = {
  getHistory: async (userId) => {
    const response = await api.get(`/api/ppd/history/${userId}`);
    return response.data;
  }
};

export const healthAPI = {
  getVitalsHistory: async (limit = 10) => {
    const response = await api.get('/api/health/vitals/history', {
      params: { limit },
    });
    return response.data;
  }
};

export default api;
