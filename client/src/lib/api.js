/**
 * API helpers for talking to the Node backend.
 * Sends the Supabase session JWT in Authorization header so the server can identify the user.
 */

import { supabase } from './supabase';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return '';
};

async function getAuthHeaders() {
  if (!supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function api(path, options = {}) {
  const url = `${getBaseUrl()}/api${path}`;
  const authHeaders = await getAuthHeaders();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(res.statusText);
    err.status = res.status;
    err.body = await res.json().catch(() => ({}));
    throw err;
  }
  // Some endpoints (e.g. DELETE) may return 204 No Content
  if (res.status === 204) {
    return null;
  }
  return res.json();
}

/**
 * Fetch a binary response (e.g. image download). Returns the response Blob.
 * Use for endpoints that return file content with Content-Disposition: attachment.
 */
export async function apiBlob(path) {
  const url = `${getBaseUrl()}/api${path}`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, { headers: { ...authHeaders } });
  if (!res.ok) {
    const err = new Error(res.statusText);
    err.status = res.status;
    err.body = await res.json().catch(() => ({}));
    throw err;
  }
  return res.blob();
}

/**
 * Upload FormData with progress reporting. Uses XHR so we can listen to upload progress.
 * @param {string} path - API path (e.g. '/images/upload')
 * @param {FormData} formData
 * @param {(percent: number | null) => void} onProgress - 0-100 when lengthComputable, null when indeterminate
 * @returns {Promise<object>} - Parsed JSON response
 */
export function uploadWithProgress(path, formData, onProgress) {
  const base = getBaseUrl();
  const url = `${base}/api${path}`;

  return new Promise((resolve, reject) => {
    getAuthHeaders()
      .then((authHeaders) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (typeof onProgress !== 'function') return;
          if (e.lengthComputable && e.total > 0) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          } else {
            onProgress(null);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (xhr.status === 204) {
              resolve(null);
              return;
            }
            try {
              resolve(JSON.parse(xhr.responseText || '{}'));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            const err = new Error(xhr.statusText || 'Upload failed');
            err.status = xhr.status;
            try {
              err.body = JSON.parse(xhr.responseText || '{}');
            } catch {
              err.body = {};
            }
            reject(err);
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', url);
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send(formData);
      })
      .catch(reject);
  });
}
