import { API_ROOT, createApi } from './apiClient';

const maintenanceApi = createApi(`${API_ROOT}/preventive-maintenances`, false);
const API_ORIGIN = API_ROOT.replace(/\/api\/?$/, '');

export const getPreventiveMaintenances = async () => (await maintenanceApi.get('')).data;

export const schedulePreventiveMaintenance = async (maintenance) =>
	(await maintenanceApi.post('', maintenance)).data;

export const executePreventiveMaintenance = async (id, execution, evidences) => {
	const formData = new FormData();
	formData.append('data', new Blob([JSON.stringify(execution)], { type: 'application/json' }));
	evidences.forEach((evidence) => formData.append('evidencias', evidence));
	return (await maintenanceApi.put(`/${id}/execution`, formData)).data;
};

export const getPreventiveMaintenanceEvidence = async (url) =>
	(await maintenanceApi.get(`${API_ORIGIN}${url}`, { responseType: 'blob' })).data;
