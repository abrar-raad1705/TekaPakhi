import api from './axiosInstance';

export const transactionApi = {
  sendMoney: (data) => api.post('/transactions/send-money', data),
  cashIn: (data) => api.post('/transactions/cash-in', data),
  cashOut: (data) => api.post('/transactions/cash-out', data),
  payment: (data) => api.post('/transactions/payment', data),
  payBill: (data) => api.post('/transactions/pay-bill', data),
  b2b: (data) => api.post('/transactions/b2b', data),
  getB2BAgents: () => api.get('/transactions/b2b-agents'),
  getB2BDistributor: () => api.get('/transactions/b2b-distributor'),

  preview: (type, data) => api.post(`/transactions/preview/${type}`, data),

  getHistory: (params) => api.get('/transactions/history', { params }),
  getMiniStatement: (params) => api.get('/transactions/mini-statement', { params }),
  getDetail: (id) => api.get(`/transactions/${id}`),

  lookupRecipient: (phone) => api.get(`/profile/lookup/${phone}`),

  /** Authenticated — returns PDF blob */
  receiptPdf: (transactionId) =>
    api.post('/transactions/receipt-pdf', { transactionId }, { responseType: 'blob' }),
};
