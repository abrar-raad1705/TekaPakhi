import api from './axiosInstance';

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createProfile: (data) => api.post('/admin/users', data),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  loadWallet: (id, amount) => api.post(`/admin/users/${id}/load-wallet`, { amount }),

  // Transactions
  getTransactions: (params) => api.get('/admin/transactions', { params }),
  reverseTransaction: (id) => api.post(`/admin/transactions/${id}/reverse`),

  // Config: Transaction Types
  getTransactionTypes: () => api.get('/admin/config/transaction-types'),
  updateTransactionType: (id, data) => api.patch(`/admin/config/transaction-types/${id}`, data),

  // Config: Limits
  getTransactionLimits: () => api.get('/admin/config/limits'),
  upsertTransactionLimit: (data) => api.put('/admin/config/limits', data),
  deleteTransactionLimit: (profileTypeId, txTypeId) =>
    api.delete(`/admin/config/limits/${profileTypeId}/${txTypeId}`),

  // Config: Commissions
  getCommissionPolicies: () => api.get('/admin/config/commissions'),
  upsertCommissionPolicy: (data) => api.put('/admin/config/commissions', data),
  deleteCommissionPolicy: (profileTypeId, txTypeId) =>
    api.delete(`/admin/config/commissions/${profileTypeId}/${txTypeId}`),

  // Reports
  getTransactionReport: (params) => api.get('/admin/reports/transactions', { params }),
  getUserGrowthReport: (params) => api.get('/admin/reports/user-growth', { params }),
};
