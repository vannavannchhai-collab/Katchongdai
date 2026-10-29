import { handleLocalApiRequest } from './localDbEngine.js';

let resolvedMode = null; // 'server' | 'local'
let detectingPromise = null;

export function getStorageMode() {
  return resolvedMode || 'detecting';
}

async function detectBackendMode() {
  if (resolvedMode) return resolvedMode;
  if (detectingPromise) return detectingPromise;

  detectingPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json && json.status === 'ok' && json.app === 'Katchongdai Pro') {
          resolvedMode = 'server';
          return 'server';
        }
      }
    } catch {
      // Static deployment (Vercel / GitHub Pages / Netlify) or offline
    }
    resolvedMode = 'local';
    return 'local';
  })();

  return detectingPromise;
}

export async function apiRequest(path, options = {}) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return handleLocalApiRequest(path, options);
  }

  try {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = res.headers.get('content-type') || '';

    // If a static CDN/proxy returned HTML or non-JSON 404/502, seamlessly switch to local DB engine
    if (!contentType.includes('application/json') && (res.status === 404 || res.status >= 500 || res.ok)) {
      resolvedMode = 'local';
      return handleLocalApiRequest(path, options);
    }

    const data = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const errMsg =
        (data && typeof data === 'object' && data.error) ||
        `កំហុសប្រព័ន្ធ (${res.status})`;
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    // If network connection dropped mid-session, fall back to local DB engine instead of failing
    if (err instanceof TypeError || err.name === 'AbortError') {
      resolvedMode = 'local';
      return handleLocalApiRequest(path, options);
    }
    throw err;
  }
}
