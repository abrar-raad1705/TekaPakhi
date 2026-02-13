import api from './axiosInstance';

export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
};
