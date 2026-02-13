import api from './axiosInstance';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  forgotPin: (data) => api.post('/auth/forgot-pin', data),
  resetPin: (data) => api.post('/auth/reset-pin', data),
  changePin: (data) => api.post('/auth/change-pin', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  logout: (data) => api.post('/auth/logout', data),
};
