const TOKEN_KEY = 'cms_portal_token';
const CACHE_TTL_MS = 20000;
const responseCache = new Map();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  responseCache.clear();
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function invalidateApiCache() {
  responseCache.clear();
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const useCache = options.cache === true && method === 'GET';

  if (useCache) {
    const hit = responseCache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data;
    }
  }

  const { cache: _cache, ...fetchOptions } = options;
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
      setToken('');
      responseCache.clear();
      window.dispatchEvent(new Event('cms:unauthorized'));
    }
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (method !== 'GET') {
    responseCache.clear();
  } else if (useCache) {
    if (responseCache.size >= 40) {
      const oldest = responseCache.keys().next().value;
      if (oldest !== undefined) responseCache.delete(oldest);
    }
    responseCache.set(path, { at: Date.now(), data });
  }

  return data;
}
