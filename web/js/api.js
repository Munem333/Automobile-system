let refreshPromise = null;

function getChatHeaders() {
  const token = localStorage.getItem('chatSessionToken');
  return token ? { 'X-Chat-Token': token } : {};
}

function saveChatSession(session) {
  if (!session?.id) return;
  localStorage.setItem('chatSessionId', session.id);
  if (session.chatToken) localStorage.setItem('chatSessionToken', session.chatToken);
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Session expired');
        saveAuth(json.data);
        return true;
      })
      .catch(() => {
        clearAuth();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function fetchApi(path, options = {}, retry = true) {
  if (!API_URL) {
    throw new Error(
      'This website is live, but the backend API is not connected yet. ' +
      'In Vercel → Settings → Environment Variables, add AUTOHUB_API_URL with your API URL (e.g. https://your-api.railway.app), then redeploy.'
    );
  }

  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...getChatHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot connect to the server at ${API_URL}. ` +
      'Make sure the API is running (npm run dev) and you opened the site via http://localhost:3001 — not file://.'
    );
  }

  if (res.status === 401 && retry && localStorage.getItem('refreshToken')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return fetchApi(path, options, false);
    throw new Error('Your session has expired. Please sign in again.');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Server returned an invalid response. Check that the API is running.');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Something went wrong. Please try again.');
  }

  return json.data;
}

async function postJson(path, body, auth = false) {
  if (!API_URL) {
    throw new Error(
      'This website is live, but the backend API is not connected yet. ' +
      'In Vercel → Settings → Environment Variables, add AUTOHUB_API_URL with your API URL, then redeploy.'
    );
  }

  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...getChatHeaders(),
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data ?? json;
}

const api = {
  getBrands: () => fetchApi('/api/brands'),
  getBrand: (slug) => fetchApi(`/api/brands/${slug}`),
  getFeaturedProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/api/products/featured${qs ? `?${qs}` : ''}`);
  },
  getPartCategories: () => fetchApi('/api/part-categories'),
  getCars: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/api/cars${qs ? `?${qs}` : ''}`);
  },
  getParts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/api/parts${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug) => fetchApi(`/api/products/${slug}`),
  login: (email, password) => postJson('/api/auth/login', { email, password }),
  register: (data) => postJson('/api/auth/register', data),
  getMe: () => fetchApi('/api/auth/me'),
  orderLookup: (orderNumber, contact) => postJson('/api/auth/order-lookup', { orderNumber, contact }),

  startChatSession: async (data) => {
    const result = await postJson('/api/chat/sessions', data || {}, !!localStorage.getItem('accessToken'));
    if (result?.session) saveChatSession(result.session);
    return result;
  },
  getChatMessages: (sessionId) => fetchApi(`/api/chat/sessions/${sessionId}/messages`),
  getQuickReplies: () => fetchApi('/api/chat/quick-replies'),
  updateChatGuestInfo: async (sessionId, data) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/guest-info`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (json.data?.session) saveChatSession(json.data.session);
    return json.data;
  },

  getServiceCenters: () => fetchApi('/api/appointments/service-centers'),
  getAppointmentSlots: (centerId, date) =>
    fetchApi(`/api/appointments/slots?serviceCenterId=${centerId}&date=${date}`),
  bookAppointment: (data) => postJson('/api/appointments', data, true),
  getMyAppointments: () => fetchApi('/api/appointments/my'),

  getFaq: () => fetchApi('/api/support/faq'),
  createTicket: (data) => postJson('/api/support/tickets', data, true),

  adminGet: (path) => fetchApi(`/api/admin${path}`),
  adminPost: (path, body) =>
    fetch(`${API_URL}/api/admin${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return {
        ...(json.data && typeof json.data === 'object' ? json.data : { data: json.data }),
        message: json.message,
        temporaryPassword: json.temporaryPassword,
      };
    }),
  adminPatch: (path, body) =>
    fetch(`${API_URL}/api/admin${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return {
        ...(json.data && typeof json.data === 'object' ? json.data : { data: json.data }),
        message: json.message,
      };
    }),
  adminDelete: (path) =>
    fetch(`${API_URL}/api/admin${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    }).then(async (res) => {
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    }),
  adminUploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/api/admin/uploads/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Image upload failed. Please try again.');
    return json.data;
  },
  adminChatSessions: () => fetchApi('/api/chat/admin/sessions'),
  adminChatClose: (id) =>
    fetch(`${API_URL}/api/chat/admin/sessions/${id}/close`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    }).then(async (res) => { const j = await res.json(); if (!j.success) throw new Error(j.error); return j.data; }),
  adminAppointments: (status) => fetchApi(`/api/appointments/admin${status ? `?status=${status}` : ''}`),
  adminAppointmentUpdate: (id, status) =>
    fetch(`${API_URL}/api/appointments/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      body: JSON.stringify({ status }),
    }).then(async (res) => { const j = await res.json(); if (!j.success) throw new Error(j.error); return j.data; }),
  adminTickets: (status) => fetchApi(`/api/support/admin/tickets${status ? `?status=${status}` : ''}`),
  adminTicketUpdate: (id, data) =>
    fetch(`${API_URL}/api/support/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      body: JSON.stringify(data),
    }).then(async (res) => { const j = await res.json(); if (!j.success) throw new Error(j.error); return j.data; }),
};
