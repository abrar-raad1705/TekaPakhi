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
<<<<<<< Updated upstream
// Response interceptor — handle 401 and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
=======

// Response interceptor — handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 (Unauthorized) and not an auth endpoint, clear session and redirect
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
>>>>>>> Stashed changes
    }
    return Promise.reject(error);
  }
);


export default api;
