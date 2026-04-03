import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — on 401, clear session and redirect to login (no refresh tokens)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url ?? '';

    const skipRedirect =
      url.startsWith('/auth/') ||
      url.startsWith('/admin/');

    if (error.response?.status === 401 && !originalRequest?._retry && !skipRedirect) {
      originalRequest._retry = true;
      const code = error.response?.data?.data?.code;
      if (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_SUSPENDED') {
        sessionStorage.setItem(
          'sessionTerminated',
          JSON.stringify({
            code,
            message: error.response?.data?.message || '',
          }),
        );
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
