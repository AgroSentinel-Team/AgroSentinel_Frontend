import { apiClient, createApi } from './apiClient';

const directoryApi = createApi();

function authConfig() {
  const token = localStorage.getItem('token');
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
}

function groupScopeParams(groupId, scoped) {
  if (!scoped) return undefined;
  return groupId == null ? { central: true } : { groupId };
}

function filterByInventoryScope(rows, groupId, scoped, resourceName) {
  if (!scoped) return rows;
  if (!Array.isArray(rows)) {
    throw new Error(`La respuesta del servidor para ${resourceName} no tiene el formato esperado.`);
  }
  if (rows.some((row) => !row || !Object.prototype.hasOwnProperty.call(row, 'groupId'))) {
    throw new Error(`El servidor no devuelve la zona de ${resourceName}. Reinicia el backend para aplicar el filtro por zona.`);
  }
  return rows.filter((row) => (
    groupId == null
      ? row.groupId == null
      : String(row.groupId) === String(groupId)
  ));
}

export const getInventoryItems = async (groupId, scoped = false) =>
  filterByInventoryScope((await apiClient.get('/inventory/items', {
    ...authConfig(),
    params: groupScopeParams(groupId, scoped),
  })).data, groupId, scoped, 'inventario');

export const registerInventoryMovement = async (itemId, movement, groupId, scoped = false) =>
  (await apiClient.post(`/inventory/${itemId}/movements`, {
    ...movement,
    ...(scoped ? groupScopeParams(groupId, true) : {}),
  })).data;

export const registerInitialInventoryEntry = async (entry) =>
  (await apiClient.post('/inventory/entries/new-item', entry)).data;

export const getInventoryMovements = async (groupId, scoped = false) =>
  filterByInventoryScope((await apiClient.get('/inventory/movements', {
    ...authConfig(),
    params: groupScopeParams(groupId, scoped),
  })).data, groupId, scoped, 'movimientos');

export const getInventoryGroups = async () =>
  (await directoryApi.get('/work-groups/options')).data;

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
