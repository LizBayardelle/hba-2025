// Get CSRF token
const getCsrfToken = () => {
  return document.querySelector('[name=csrf-token]')?.content || '';
};

// Base fetch wrapper
const apiRequest = async (url, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};

// Document API methods
export const documentsApi = {
  // Fetch all documents
  fetchAll: () => apiRequest('/contents.json'),

  // Fetch single document
  fetchOne: (id) => apiRequest(`/contents/${id}.json`),

  // Create document
  create: (data) => apiRequest('/contents', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update document
  update: (id, data) => apiRequest(`/contents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete document
  delete: (id) => apiRequest(`/contents/${id}`, {
    method: 'DELETE',
  }),
};

// Journal API methods
export const journalsApi = {
  // Fetch all journals
  fetchAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/journals.json${query ? `?${query}` : ''}`);
  },

  // Fetch single journal
  fetchOne: (id) => apiRequest(`/journals/${id}.json`),

  // Create journal
  create: (data) => apiRequest('/journals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update journal
  update: (id, data) => apiRequest(`/journals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete journal
  delete: (id) => apiRequest(`/journals/${id}`, {
    method: 'DELETE',
  }),
};

// Tags API methods
export const tagsApi = {
  // Fetch all tags
  fetchAll: () => apiRequest('/tags.json'),

  // Fetch single tag with all associated items
  fetchOne: (id) => apiRequest(`/tags/${id}.json`),

  // Update tag
  update: (id, data) => apiRequest(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete tag
  delete: (id) => apiRequest(`/tags/${id}`, {
    method: 'DELETE',
  }),
};
