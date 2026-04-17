import axios from "axios";

/**
 * Configured Axios instance.
 * - Automatically attaches JWT token from localStorage to every request
 * - Handles 401 responses by logging the user out
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export const buildProtectedAssetUrl = (assetPath) => {
  if (!assetPath) return "";
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
  const apiRoot = apiBase.replace(/\/api$/, "");
  const token = localStorage.getItem("token");
  return token ? `${apiRoot}${assetPath}?token=${encodeURIComponent(token)}` : `${apiRoot}${assetPath}`;
};

// ── Request interceptor: attach JWT ─────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle auth errors ─────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ── Profile API ──────────────────────────────────────────────
export const profileAPI = {
  get: () => api.get("/profile"),
  update: (data) => api.put("/profile", data),
  updatePassword: (data) => api.put("/profile/password", data),
  updatePreferences: (data) => api.put("/profile/preferences", data),
};

// ── Admin API ────────────────────────────────────────────────
export const adminAPI = {
  getAllUsers: () => api.get("/admin/users"),
  disableUser: (id) => api.put(`/admin/users/${id}/disable`),
  enableUser: (id) => api.put(`/admin/users/${id}/enable`),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  getAllUsers: () => api.get("/admin/users"),
  disableUser: (id) => api.put(`/admin/users/${id}/disable`),
  enableUser: (id) => api.put(`/admin/users/${id}/enable`),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateNotification: (id, data) => api.put(`/admin/notifications/${id}`, data),
  updateUserNotification: (id, userId, data) => api.put(`/admin/notifications/${id}/user/${userId}`, data),
  updateMultipleUserNotifications: (id, data) => api.put(`/admin/notifications/${id}/multiple-user-updates`, data),
  deleteForUsers: (id, userIds) => api.delete(`/admin/notifications/${id}/users`, { data: userIds }),
  getReplies: () => api.get("/admin/notification-replies"),
  getRepliesByNotification: (id) => api.get(`/admin/notification-replies/${id}`),
  markReplyRead: (id) => api.patch(`/admin/notification-replies/${id}/read`),
  getUnreadReplyCount: () => api.get("/admin/notification-replies/unread-count"),

  // Templates
  getTemplates: () => api.get("/admin/templates"),
  getTemplate: (id) => api.get(`/admin/templates/${id}`),
  createTemplate: (data) => api.post("/admin/templates", data),
  updateTemplate: (id, data) => api.put(`/admin/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/admin/templates/${id}`),
};

export const messageAPI = {
  getUsers: () => api.get("/messages/users"),
  getBlockedUsers: () => api.get("/messages/blocked"),
  getConversations: () => api.get("/messages/conversations"),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  send: (data) => api.post("/messages/send", data),
  markConversationRead: (userId) => api.patch(`/messages/conversation/${userId}/read`),
  getUnreadCount: () => api.get("/messages/unread-count"),
  block: (userId) => api.put(`/messages/block/${userId}`),
  unblock: (userId) => api.delete(`/messages/block/${userId}`),
};

// ── Notification API ─────────────────────────────────────────
export const notificationAPI = {
  send: (data) => {
    if (data instanceof FormData) {
      return api.post("/notifications/send", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }
    return api.post("/notifications/send", data);
  },
  getAll: () => api.get("/notifications/all"),          // admin
  getMy: () => api.get("/notifications/my"),             // current user
  filter: (data) => api.post("/notifications/filter", data),


  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  deletePermanently: (id) => api.delete(`/notifications/${id}`), // admin
  deleteFromView: (id) => api.delete(`/notifications/user/${id}`), // user
  clearAll: () => api.delete("/notifications/clear-all"),
  pin: (id) => api.put(`/notifications/${id}/pin`),
  favorite: (id) => api.put(`/notifications/${id}/favorite`),
  archive: (id) => api.patch(`/notifications/${id}/archive`),
  snooze: (id, data) => api.post(`/notifications/${id}/snooze`, data),
  getOfflineNew: () => api.get("/notifications/offline-new"),
  reply: (id, data) => api.post(`/notifications/${id}/reply`, data),
  notifyEditing: (id) => api.post(`/notifications/${id}/notify-editing`),
  bulkDelete: (ids) => api.delete("/notifications/bulk-delete", { data: ids }),
};

export default api;
