import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('current_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name, email, password, role, profileData) => {
    const res = await api.post('/auth/register', { name, email, password, role, profileData });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, password) => {
    const res = await api.post('/auth/reset-password', { token, password });
    return res.data;
  }
};

export const studentAPI = {
  list: async (params) => {
    const res = await api.get('/students', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },
  create: async (formData) => {
    // Supports multipart form data for photo uploads
    const res = await api.post('/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  bulkUpload: async (studentsArray) => {
    const res = await api.post('/students/bulk', { students: studentsArray });
    return res.data;
  },
  update: async (id, formData) => {
    const res = await api.put(`/students/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
};

export const subjectAPI = {
  list: async (params) => {
    const res = await api.get('/subjects', { params });
    return res.data;
  },
  create: async (subjectData) => {
    const res = await api.post('/subjects', subjectData);
    return res.data;
  },
  update: async (id, subjectData) => {
    const res = await api.put(`/subjects/${id}`, subjectData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/subjects/${id}`);
    return res.data;
  }
};

export const timetableAPI = {
  list: async (params) => {
    const res = await api.get('/timetable', { params });
    return res.data;
  },
  getStudent: async (studentId) => {
    const res = await api.get(`/timetable/student/${studentId}`);
    return res.data;
  },
  getFaculty: async (facultyId) => {
    const res = await api.get(`/timetable/faculty/${facultyId}`);
    return res.data;
  },
  save: async (timetableData) => {
    const res = await api.post('/timetable', timetableData);
    return res.data;
  }
};

export const leaveAPI = {
  apply: async (formData) => {
    const res = await api.post('/leave/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  getStudent: async (studentId) => {
    const res = await api.get(`/leave/student/${studentId}`);
    return res.data;
  },
  getPending: async () => {
    const res = await api.get('/leave/pending');
    return res.data;
  },
  review: async (id, status, remarks) => {
    const res = await api.post(`/leave/${id}/review`, { status, remarks });
    return res.data;
  }
};

export const attendanceAPI = {
  list: async (params) => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },
  mark: async (attendanceData) => {
    const res = await api.post('/attendance', attendanceData);
    return res.data;
  },
  bulkMark: async (studentIds, status, date, subjectId) => {
    const res = await api.post('/attendance', { studentIds, status, date, subjectId });
    return res.data;
  },
  update: async (id, status, date) => {
    const res = await api.put(`/attendance/${id}`, { status, date });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/attendance/${id}`);
    return res.data;
  },
};

export const analyticsAPI = {
  getDashboard: async () => {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },
  getReports: async (params) => {
    const res = await api.get('/analytics/reports', { params });
    return res.data;
  },
  getHeatmap: async () => {
    const res = await api.get('/analytics/heatmap');
    return res.data;
  },
  getAchievements: async (studentId) => {
    const res = await api.get(`/analytics/achievements/${studentId}`);
    return res.data;
  },
  getLeaderboard: async () => {
    const res = await api.get('/analytics/leaderboard');
    return res.data;
  }
};

export const aiAPI = {
  predict: async (studentId) => {
    const res = await api.post('/ai/predict', { studentId });
    return res.data;
  },
  getInsights: async () => {
    const res = await api.post('/ai/insights');
    return res.data;
  },
  generateReport: async (type, date) => {
    const res = await api.post('/ai/report', { type, date });
    return res.data;
  },
  chat: async (message) => {
    const res = await api.post('/ai/chat', { message });
    return res.data;
  },
  getAnomalies: async () => {
    const res = await api.post('/ai/anomalies');
    return res.data;
  }
};

export const auditAPI = {
  list: async () => {
    const res = await api.get('/audit-logs');
    return res.data;
  }
};

export default api;
