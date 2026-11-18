import { Platform } from 'react-native';
import { API_URL } from './config';

/** Incidents fetched per page; more are loaded as the user scrolls. */
export const PAGE_SIZE = 8;

let authToken = null;
export const setAuthToken = (t) => { authToken = t; };

async function request(method, path, { body, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}. Check your connection.`);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export const api = {
  login: (email, password) => request('POST', '/auth/login', { body: { email, password } }),
  register: (name, email, password) => request('POST', '/auth/register', { body: { name, email, password } }),
  me: () => request('GET', '/auth/me'),

  categories: () => request('GET', '/categories'),
  incidents: ({ category, page = 1, q, limit = PAGE_SIZE } = {}) =>
    request('GET', `/incidents?${qs({ category, page, q, limit })}`),
  myIncidents: ({ page = 1, limit = PAGE_SIZE } = {}) => request('GET', `/incidents/mine?${qs({ page, limit })}`),
  incident: (id) => request('GET', `/incidents/${id}`),
  deleteIncident: (id) => request('DELETE', `/incidents/${id}`),

  async createIncident({ title, description, category, latitude, longitude, address, images }) {
    const form = new FormData();
    form.append('title', title);
    form.append('description', description || '');
    form.append('category', category);
    form.append('latitude', String(latitude));
    form.append('longitude', String(longitude));
    if (address) form.append('address', address);

    for (const [i, img] of images.entries()) {
      const name = img.fileName || `incident-${Date.now()}-${i}.jpg`;
      const type = img.mimeType || 'image/jpeg';
      if (Platform.OS === 'web') {
        const blob = img.file || (await (await fetch(img.uri)).blob());
        form.append('images', blob, name);
      } else {
        // React Native's FormData accepts { uri, name, type } file descriptors.
        form.append('images', { uri: img.uri, name, type });
      }
    }
    return request('POST', '/incidents', { form });
  },

  registerPushToken: (token) => request('POST', '/push-tokens', { body: { token } }),
};
