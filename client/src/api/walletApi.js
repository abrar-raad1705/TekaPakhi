import api from './axiosInstance';

export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
  getDashboardStats: () => api.get('/wallet/dashboard-stats'),
};
