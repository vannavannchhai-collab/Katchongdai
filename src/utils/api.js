export async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
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
}
