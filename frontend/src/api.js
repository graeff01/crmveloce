import axios from "axios";

const API_URL = "http://localhost:5000/api";

// Configura axios para manter sessão autenticada
axios.defaults.withCredentials = true;

const api = {
  // =============================
  // 🔐 AUTENTICAÇÃO
  // =============================
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
  },

  logout: async () => {
    const response = await axios.post(`${API_URL}/logout`);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await axios.get(`${API_URL}/me`);
    return response.data;
  },

  // =============================
  // 👤 USUÁRIOS
  // =============================
  getUsers: async () => {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await axios.post(`${API_URL}/users`, userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await axios.put(`${API_URL}/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await axios.delete(`${API_URL}/users/${userId}`);
    return response.data;
  },

  changePassword: async (userId, newPassword) => {
    const response = await axios.put(`${API_URL}/users/${userId}/password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  // =============================
  // 💬 LEADS
  // =============================
  getLeads: async () => {
    const response = await axios.get(`${API_URL}/leads`);
    return response.data;
  },

  getLeadsQueue: async () => {
    const response = await axios.get(`${API_URL}/leads/queue`);
    return response.data;
  },

  assignLead: async (leadId) => {
    const response = await axios.post(`${API_URL}/leads/${leadId}/assign`);
    return response.data;
  },

  updateLeadStatus: async (leadId, status) => {
    const response = await axios.put(`${API_URL}/leads/${leadId}/status`, { status });
    return response.data;
  },

  transferLead: async (leadId, vendedorId) => {
    const response = await axios.post(`${API_URL}/leads/${leadId}/transfer`, {
      vendedor_id: vendedorId,
    });
    return response.data;
  },

  // =============================
  // 🧾 MENSAGENS
  // =============================
  getMessages: async (leadId) => {
    const response = await axios.get(`${API_URL}/leads/${leadId}/messages`);
    return response.data;
  },

  sendMessage: async (leadId, content) => {
    const response = await axios.post(`${API_URL}/leads/${leadId}/messages`, { content });
    return response.data;
  },

// =============================
  // 🗒️ NOTAS INTERNAS
  // =============================
  getNotes: async (leadId) => {
    const response = await axios.get(`${API_URL}/leads/${leadId}/notes`);
    return response.data;
  },

  addNote: async (leadId, note) => {
  const response = await axios.post(`${API_URL}/leads/${leadId}/notes`, { note });
  return response.data;
},

  // =============================
  // 📜 TIMELINE DO LEAD
  // =============================
  getLeadLogs: async (leadId) => {
    const response = await axios.get(`${API_URL}/lead/${leadId}/logs`);
    return response.data;
  },

  // =============================
  // 📊 MÉTRICAS
  // =============================
  getMetrics: async (period = "month", vendedorId = null) => {
    const params = { period };
    if (vendedorId) params.vendedor_id = vendedorId;
    const response = await axios.get(`${API_URL}/metrics`, { params });
    return response.data;
  },

  // =============================
  // 📞 WHATSAPP
  // =============================
  getWhatsAppStatus: async () => {
    const response = await axios.get(`${API_URL}/whatsapp/status`);
    return response.data;
  },

  // =============================
  // 🧩 LOGS DE AUDITORIA
  // =============================
  getAuditLog: async (params = {}) => {
    const response = await axios.get(`${API_URL}/audit-log`, { params });
    return response.data;
  },

  // =============================
  // 🧪 SIMULADOR (modo DEV)
  // =============================
  simulateMessage: async (phone, content, name) => {
    const response = await axios.post(`${API_URL}/simulate/message`, {
      phone,
      content,
      name,
    });
    return response.data;
  },
};

export default api;
