import axios from 'axios';

const api = axios.create({
  timeout: 60000,
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

export const chatAPI = {
  getHistory: async (userId) => {
    const response = await api.get(`/api/chat/history/${userId}`);
    return response.data;
  },
  analyze: async (message, profile, mode, userId) => {
    const response = await api.post('/api/chat/analyze', { message, profile, mode, user_id: userId });
    return response.data;
  },
  speak: async (audioBlob, profile, mode, userId) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('profile', JSON.stringify(profile));
    formData.append('mode', mode);
    formData.append('user_id', userId);
    
    const response = await api.post('/api/chat/speak', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const healthAPI = {
  logVitals: async (vitalsData) => {
    const response = await api.post('/api/health/vitals', vitalsData);
    return response.data;
  },
  getVitalsHistory: async (limit = 10) => {
    const response = await api.get('/api/health/vitals/history', { params: { limit } });
    return response.data;
  },
  reportDangerSigns: async (symptoms) => {
    const response = await api.post('/api/health/danger-signs', { symptoms });
    return response.data;
  },
  logKickSession: async (kickCount, elapsedSecs) => {
    const response = await api.post('/api/health/kick', { kick_count: kickCount, elapsed_secs: elapsedSecs });
    return response.data;
  },
};

export const communityAPI = {
  getGroups: async (category = null) => {
    const response = await api.get('/api/community/groups', { params: { category } });
    return response.data;
  },
  getGroupMembers: async (groupId) => {
    const response = await api.get(`/api/community/groups/${groupId}/members`);
    return response.data;
  },
  createGroup: async (groupData) => {
    const response = await api.post('/api/community/groups', groupData);
    return response.data;
  },
  joinGroup: async (groupId, userId) => {
    const response = await api.post(`/api/community/groups/${groupId}/join`, { user_id: userId });
    return response.data;
  },
  leaveGroup: async (groupId, userId) => {
    const response = await api.post(`/api/community/groups/${groupId}/leave`, { user_id: userId });
    return response.data;
  },
  getPosts: async (groupId) => {
    const response = await api.get(`/api/community/groups/${groupId}/posts`);
    return response.data;
  },
  createPost: async (groupId, postData) => {
    const response = await api.post(`/api/community/groups/${groupId}/posts`, postData);
    return response.data;
  },
  likePost: async (postId) => {
    const response = await api.post(`/api/community/posts/${postId}/like`);
    return response.data;
  },
  deletePost: async (postId, userId) => {
    const response = await api.delete(`/api/community/posts/${postId}`, { data: { user_id: userId } });
    return response.data;
  },
  getComments: async (postId) => {
    const response = await api.get(`/api/community/posts/${postId}/comments`);
    return response.data;
  },
  addComment: async (postId, commentData) => {
    const response = await api.post(`/api/community/posts/${postId}/comments`, commentData);
    return response.data;
  },
  getInbox: async (userId) => {
    const response = await api.get(`/api/community/dm/inbox/${userId}`);
    return response.data;
  },
  getDMThread: async (userA, userB) => {
    const response = await api.get(`/api/community/dm/thread/${userA}/${userB}`);
    return response.data;
  },
  sendDM: async (receiverId, dmData) => {
    const response = await api.post(`/api/community/dm/${receiverId}`, dmData);
    return response.data;
  },
};

export const clinicianAPI = {
  getAlerts: async () => {
    const response = await api.get('/api/clinician/alerts');
    return response.data;
  },
  dismissAlert: async (alertId) => {
    const response = await api.patch(`/api/clinician/alerts/${alertId}/dismiss`);
    return response.data;
  },
  getPatients: async () => {
    const response = await api.get('/api/clinician/patients');
    return response.data;
  },
  getPatientSummary: async (patientId) => {
    const response = await api.get(`/api/clinician/patients/${patientId}/summary`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/api/clinician/stats');
    return response.data;
  }
};

export const sosAPI = {
  triggerSOS: async (sosData) => {
    const response = await api.post('/api/sos/trigger', sosData);
    return response.data;
  },
  getContacts: async () => {
    const response = await api.get('/api/sos/contacts');
    return response.data;
  },
  getPersonalContacts: async (userId) => {
    const response = await api.get(`/api/sos/contacts/personal/${userId}`);
    return response.data;
  }
};

export default api;
