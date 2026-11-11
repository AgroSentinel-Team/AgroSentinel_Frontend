import { API_ORIGIN, API_ROOT, createApi } from './apiClient';
import { cachedRequest, sendOrQueueForm, sendOrQueueJson } from './offlineApi';

const maintenanceApi = createApi(`${API_ROOT}/preventive-maintenances`, false);

export const getPreventiveMaintenances = async () =>
	cachedRequest('preventive-maintenances', async () => (await maintenanceApi.get('')).data);

export const getPreventiveTechnicianAvailability = async () =>
	(await maintenanceApi.get('/technicians/availability')).data;

export const schedulePreventiveMaintenance = async (maintenance) =>
	sendOrQueueJson({
		endpoint: '/preventive-maintenances',
		method: 'POST',
		payload: maintenance,
		operationType: 'preventive_maintenance.schedule',
	});

export const executePreventiveMaintenance = async (id, execution, evidences) => {
	const formData = new FormData();
	formData.append('data', new Blob([JSON.stringify(execution)], { type: 'application/json' }));
	evidences.forEach((evidence) => formData.append('evidencias', evidence));
	return sendOrQueueForm({
		endpoint: `/preventive-maintenances/${id}/execution`,
		method: 'PUT',
		formData,
		operationType: 'preventive_maintenance.execution',
		metadata: { maintenanceId: id },
	});
};

export const getPreventiveMaintenanceEvidence = async (url) =>
	(await maintenanceApi.get(`${API_ORIGIN}${url}`, { responseType: 'blob' })).data;
