import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

/** Axios instance for /admin/* — uses `adminToken`, not user `accessToken`. */
const adminApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      const path = window.location.pathname || "";
      if (!path.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Public: password login for admin panel */
export const adminLoginRequest = (password) =>
  axios.post(`${API_URL}/admin/login`, { password });

export const adminApi = {
  getDashboard: () => adminApiClient.get("/admin/dashboard"),

  getUsers: (params) => adminApiClient.get("/admin/users", { params }),
  createProfile: (data) => adminApiClient.post("/admin/users", data),
  getUserDetail: (id) => adminApiClient.get(`/admin/users/${id}`),
  updateUserStatus: (id, status, suspendedUntil) =>
    adminApiClient.patch(`/admin/users/${id}/status`, { status, ...(suspendedUntil ? { suspendedUntil } : {}) }),
  loadWallet: (id, amount) =>
    adminApiClient.post(`/admin/users/${id}/load-wallet`, { amount }),
  updateWalletLimit: (id, maxBalance) =>
    adminApiClient.patch(`/admin/users/${id}/wallet-limit`, { maxBalance }),
  setPinResetGrant: (id, granted) =>
    adminApiClient.patch(`/admin/users/${id}/pin-reset-grant`, { granted }),

  getTransactions: (params) =>
    adminApiClient.get("/admin/transactions", { params }),
  reverseTransaction: (id) =>
    adminApiClient.post(`/admin/transactions/${id}/reverse`),

  getTransactionTypes: () =>
    adminApiClient.get("/admin/config/transaction-types"),
  updateTransactionType: (id, data) =>
    adminApiClient.patch(`/admin/config/transaction-types/${id}`, data),

  getTransactionLimits: () => adminApiClient.get("/admin/config/limits"),
  upsertTransactionLimit: (data) =>
    adminApiClient.put("/admin/config/limits", data),
  deleteTransactionLimit: (profileTypeId, txTypeId) =>
    adminApiClient.delete(`/admin/config/limits/${profileTypeId}/${txTypeId}`),

  getCommissionPolicies: () => adminApiClient.get("/admin/config/commissions"),
  upsertCommissionPolicy: (data) =>
    adminApiClient.put("/admin/config/commissions", data),
  deleteCommissionPolicy: (profileTypeId, txTypeId) =>
    adminApiClient.delete(
      `/admin/config/commissions/${profileTypeId}/${txTypeId}`,
    ),

  getSecurityLogs: (params) => adminApiClient.get("/admin/logs/security", { params }),
  getActionLogs: (params) => adminApiClient.get("/admin/logs/actions", { params }),
  getAuditLogs: (params) => adminApiClient.get("/admin/logs/audit", { params }),

  getTransactionReport: (params) =>
    adminApiClient.get("/admin/reports/transactions", { params }),
  getUserGrowthReport: (params) =>
    adminApiClient.get("/admin/reports/user-growth", { params }),
  getMfsOverviewReport: (params) =>
    adminApiClient.get("/admin/reports/mfs-overview", { params }),

  getProfileTypes: () => adminApiClient.get("/admin/config/profile-types"),
};
