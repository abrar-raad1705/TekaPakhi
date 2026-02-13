import api from './axiosInstance';

export const recipientApi = {
  getAll: () => api.get('/recipients'),
  create: (data) => api.post('/recipients', data),
  delete: (id) => api.delete(`/recipients/${id}`),
};
