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

// Multipart fetch wrapper (for file uploads via FormData)
const multipartRequest = async (url, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
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

  // Toggle pin status
  togglePin: (id) => apiRequest(`/contents/${id}/toggle_pin`, {
    method: 'POST',
  }),

  // Add files to a document
  addFiles: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('habit_content[files][]', file);
    });
    return multipartRequest(`/contents/${id}`, {
      method: 'PATCH',
      body: formData,
    });
  },

  // Remove a file attachment from a document
  removeFile: (id, fileId) => apiRequest(`/contents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ habit_content: { remove_file_ids: [fileId] } }),
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

// Tasks API methods
export const tasksApi = {
  // Fetch all tasks
  fetchAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/tasks.json${query ? `?${query}` : ''}`);
  },

  // Fetch single task
  fetchOne: (id) => apiRequest(`/tasks/${id}.json`),

  // Create task
  create: (data) => apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update task
  update: (id, data) => apiRequest(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete task
  delete: (id) => apiRequest(`/tasks/${id}`, {
    method: 'DELETE',
  }),
};

// Goals API methods
export const goalsApi = {
  fetchAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/goals.json${query ? `?${query}` : ''}`);
  },
  fetchOne: (id) => apiRequest(`/goals/${id}.json`),
  create: (data) => apiRequest('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/goals/${id}`, {
    method: 'DELETE',
  }),
  increment: (id) => apiRequest(`/goals/${id}/increment`, {
    method: 'POST',
  }),
  decrement: (id) => apiRequest(`/goals/${id}/decrement`, {
    method: 'POST',
  }),
};

// Categories API methods
export const categoriesApi = {
  fetchAll: () => apiRequest('/categories.json'),
};

// Habits API methods
export const habitsApi = {
  // Fetch single habit
  fetchOne: (categoryId, habitId) => apiRequest(`/categories/${categoryId}/habits/${habitId}.json`),
};

// Lists API methods
export const listsApi = {
  // Fetch all lists
  fetchAll: () => apiRequest('/lists.json'),

  // Fetch single list
  fetchOne: (id) => apiRequest(`/lists/${id}.json`),

  // Create list
  create: (data) => apiRequest('/lists', {
    method: 'POST',
    body: JSON.stringify({ list: data }),
  }),

  // Update list
  update: (id, data) => apiRequest(`/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ list: data }),
  }),

  // Delete list
  delete: (id) => apiRequest(`/lists/${id}`, {
    method: 'DELETE',
  }),

  // Toggle pin status
  togglePin: (id) => apiRequest(`/lists/${id}/toggle_pin`, {
    method: 'POST',
  }),
};

// Prep Questions API methods
export const prepQuestionsApi = {
  // Fetch all questions
  fetchAll: () => apiRequest('/daily_prep/manage.json'),

  // Create question
  create: (data) => apiRequest('/prep_questions', {
    method: 'POST',
    body: JSON.stringify({ prep_question: data }),
  }),

  // Update question
  update: (id, data) => apiRequest(`/prep_questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ prep_question: data }),
  }),

  // Delete (archive) question
  delete: (id) => apiRequest(`/prep_questions/${id}`, {
    method: 'DELETE',
  }),
};

// Prep Responses API methods
export const prepResponsesApi = {
  // Fetch responses for a date
  fetchForDate: (date) => apiRequest(`/prep_responses.json?date=${date}`),

  // Create or update response
  upsert: (data) => apiRequest('/prep_responses', {
    method: 'POST',
    body: JSON.stringify({ prep_response: data }),
  }),

  // Update response
  update: (id, data) => apiRequest(`/prep_responses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ prep_response: data }),
  }),
};

// Checklist Items API methods
export const checklistItemsApi = {
  // Task checklist items
  createForTask: (taskId, data) => apiRequest(`/tasks/${taskId}/checklist_items`, {
    method: 'POST',
    body: JSON.stringify({ checklist_item: data }),
  }),

  updateForTask: (taskId, itemId, data) => apiRequest(`/tasks/${taskId}/checklist_items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ checklist_item: data }),
  }),

  deleteForTask: (taskId, itemId) => apiRequest(`/tasks/${taskId}/checklist_items/${itemId}`, {
    method: 'DELETE',
  }),

  reorderForTask: (taskId, itemIds) => apiRequest(`/tasks/${taskId}/checklist_items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ item_ids: itemIds }),
  }),

  // Habit checklist items
  createForHabit: (habitId, data) => apiRequest(`/habits/${habitId}/checklist_items`, {
    method: 'POST',
    body: JSON.stringify({ checklist_item: data }),
  }),

  updateForHabit: (habitId, itemId, data) => apiRequest(`/habits/${habitId}/checklist_items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ checklist_item: data }),
  }),

  deleteForHabit: (habitId, itemId) => apiRequest(`/habits/${habitId}/checklist_items/${itemId}`, {
    method: 'DELETE',
  }),

  reorderForHabit: (habitId, itemIds) => apiRequest(`/habits/${habitId}/checklist_items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ item_ids: itemIds }),
  }),

  // List checklist items
  createForList: (listId, data) => apiRequest(`/lists/${listId}/checklist_items`, {
    method: 'POST',
    body: JSON.stringify({ checklist_item: data }),
  }),

  updateForList: (listId, itemId, data) => apiRequest(`/lists/${listId}/checklist_items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ checklist_item: data }),
  }),

  deleteForList: (listId, itemId) => apiRequest(`/lists/${listId}/checklist_items/${itemId}`, {
    method: 'DELETE',
  }),

  reorderForList: (listId, itemIds) => apiRequest(`/lists/${listId}/checklist_items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ item_ids: itemIds }),
  }),

  // Goal checklist items
  createForGoal: (goalId, data) => apiRequest(`/goals/${goalId}/checklist_items`, {
    method: 'POST',
    body: JSON.stringify({ checklist_item: data }),
  }),

  updateForGoal: (goalId, itemId, data) => apiRequest(`/goals/${goalId}/checklist_items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ checklist_item: data }),
  }),

  deleteForGoal: (goalId, itemId) => apiRequest(`/goals/${goalId}/checklist_items/${itemId}`, {
    method: 'DELETE',
  }),

  reorderForGoal: (goalId, itemIds) => apiRequest(`/goals/${goalId}/checklist_items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ item_ids: itemIds }),
  }),
};
