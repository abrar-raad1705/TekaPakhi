import api from './axiosInstance';

export const locationsApi = {
  getDistricts: () => api.get('/locations/districts'),
  getAreas: (district) => api.get('/locations/areas', { params: { district } }),
};
