import axios from 'axios';

const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
