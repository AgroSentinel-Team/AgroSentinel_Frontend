import { apiClient } from './apiClient';

function authConfig() {
  const token = localStorage.getItem('token');
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
}

export const getInventoryItems = async () =>
  (await apiClient.get('/inventory/items', authConfig())).data;

export const registerInventoryMovement = async (itemId, movement) =>
  (await apiClient.post(`/inventory/${itemId}/movements`, movement)).data;

export const registerInitialInventoryEntry = async (entry) =>
  (await apiClient.post('/inventory/entries/new-item', entry)).data;

export const getInventoryMovements = async () =>
  (await apiClient.get('/inventory/movements')).data;

export const getInventoryTasks = async () =>
  (await apiClient.get('/inventory/tasks', authConfig())).data;

export const createInventoryTask = async (description) =>
  (await apiClient.post('/inventory/tasks', { description }, authConfig())).data;

export const setInventoryTaskCompleted = async (taskId, completed) =>
  (await apiClient.patch(`/inventory/tasks/${taskId}`, null, {
    ...authConfig(),
    params: { completed },
  })).data;

export const deleteInventoryTask = async (taskId) =>
  apiClient.delete(`/inventory/tasks/${taskId}`, authConfig());
