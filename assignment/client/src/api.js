import { useEffect, useState } from 'react';

export const TOKEN = 'bookstore-token';

export async function api(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN);
  const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 401 && token) {
    sessionStorage.removeItem(TOKEN);
    window.location.assign(/^\/admin(?:\/|$)/.test(window.location.pathname) ? '/admin/login' : '/login');
  }
  if (response.status === 204) return {};
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error?.message || 'Request failed'), { status: response.status, code: body.error?.code });
  return body;
}

export function useApi(path) {
  const [state, setState] = useState({ loading: true, error: '', data: null, pagination: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    api(path, { signal: controller.signal })
      .then(result => setState({ loading: false, error: '', data: result.data, pagination: result.pagination }))
      .catch(err => { if (err.name !== 'AbortError') setState(current => ({ ...current, loading: false, error: err.message })); });
    return () => controller.abort();
  }, [path, retry]);
  return { ...state, reload: () => setRetry(value => value + 1), setData: data => setState(current => ({ ...current, data })) };
}

// A plain link cannot send the JWT, so the file is fetched with the token and saved from a blob.
export async function downloadFile(path) {
  const token = sessionStorage.getItem(TOKEN);
  const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || 'Could not download the file');
  }
  const name = /filename="?([^";]+)"?/.exec(response.headers.get('content-disposition') || '')?.[1] || 'book.pdf';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

// Uses fetch directly so the store's JWT is never sent to Cloudinary.
export async function uploadImage(file) {
  const { data: signed } = await api('/admin/uploads/signature', { method: 'POST' });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', signed.timestamp);
  form.append('folder', signed.folder);
  form.append('allowed_formats', signed.allowedFormats);
  form.append('signature', signed.signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: 'POST', body: form });
  const body = await response.json();
  if (!response.ok) throw new Error(`Could not upload ${file.name}: ${body.error?.message || 'image storage rejected the file'}`);
  return { url: body.secure_url, publicId: body.public_id };
}
