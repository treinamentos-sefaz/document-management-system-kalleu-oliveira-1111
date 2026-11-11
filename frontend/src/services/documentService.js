const API_PREFIX = '/api';

async function request(path, userId, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: { 'X-User-Id': userId, ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Falha na requisição (status ${response.status}).`);
  }
  return response;
}

export async function listDocuments(userId) {
  const response = await request('/documents', userId);
  return response.json();
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body: formData });
  return response.json();
}

// O download exige o cabeçalho X-User-Id, por isso usa fetch + Blob em vez de um link direto.
export async function downloadDocument(userId, document) {
  const response = await request(`/documents/${encodeURIComponent(document.id)}/download`, userId);
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.originalName;
  link.click();
  URL.revokeObjectURL(url);
}
