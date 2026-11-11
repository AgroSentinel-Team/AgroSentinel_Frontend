import { API_ORIGIN, API_ROOT, createApi } from './apiClient';
import { cachedRequest, sendOrQueueForm } from './offlineApi';

export { API_ORIGIN, API_ROOT };

const assetApi = createApi(`${API_ROOT}/assets`);
const assetUploadApi = createApi(`${API_ROOT}/assets`, false);
const directoryApi = createApi(API_ROOT);
const predictiveApi = createApi(API_ROOT);
const failureReportApi = createApi(`${API_ROOT}/failure-reports`, false);

export const getAssets = async () =>
	cachedRequest('assets', async () => (await assetApi.get('')).data);

export const getAssignedAssets = async () => (await assetApi.get('/assigned')).data;

export const createAsset = async (asset) => (await assetApi.post('', asset)).data;

export const updateAsset = async (id, asset) => (await assetApi.put(`/${id}`, asset)).data;

export const uploadAssetImage = async (id, image) => {
	const formData = new FormData();
	formData.append('image', image);
	return (await assetUploadApi.post(`/${id}/image`, formData)).data;
};

export const deactivateAsset = async (id) => (await assetApi.patch(`/${id}/deactivate`)).data;

export const deleteAsset = async (id) => assetApi.delete(`/${id}`);

export const getAssetResume = async (id) => (await assetApi.get(`/${id}/resume`)).data;

export const getAssetFailureTrends = async (id) => (await assetApi.get(`/${id}/failure-trends`)).data;

export const getAssignedAssetResume = async (id) => (await assetApi.get(`/assigned/${id}/resume`)).data;

export const getPredictiveAssets = async () => {
  try {
    return (await predictiveApi.get('/predictive/assets')).data;
  } catch (error) {
    if (error.response?.status === 401) return [];
    throw error;
  }
};

export const getPredictiveHistory = async (id) => {
  return (await predictiveApi.get(`/predictive/assets/${id}/history`)).data;
};

export const savePredictiveFeedback = async (id, fallaRealConfirmada) =>
    (await predictiveApi.put(`/predictive/records/${id}/feedback`, { fallaRealConfirmada })).data;

export const getCategories = async () =>
	cachedRequest('categories', async () => (await directoryApi.get('/categories')).data);

export const createCategory = async (category) => (await directoryApi.post('/categories', category)).data;

export const getUsers = async () =>
	cachedRequest('users', async () => (await directoryApi.get('/users')).data);

export const getFailureReportAssets = async () =>
	cachedRequest('failure-report-assets', async () => (await failureReportApi.get('/assets')).data);

export const getFailureReports = async () =>
	cachedRequest('failure-reports', async () => (await failureReportApi.get('')).data);

export const getFailureIntervention = async (id) =>
	(await failureReportApi.get(`/${id}/intervention`)).data;

export const closeFailureReport = async (id, reviewObservations) =>
	(await failureReportApi.post(`/${id}/close`, { reviewObservations })).data;

export const getFailureEvidence = async (url) =>
	(await createApi(API_ORIGIN).get(url, { responseType: 'blob' })).data;

export const getFailureReportGroups = async () =>
	cachedRequest('work-groups-options', async () => (await directoryApi.get('/work-groups/options')).data);

const getStoredRoles = () => {
	const role = localStorage.getItem('rol') ?? '';
	try {
		const roles = JSON.parse(localStorage.getItem('roles') ?? '[]');
		return [role, ...(Array.isArray(roles) ? roles : [])]
			.map((item) => String(item ?? '').toUpperCase().replace(/^ROLE_/, ''));
	} catch {
		return [role.toUpperCase().replace(/^ROLE_/, '')];
	}
};

const hasStoredRole = (allowedRoles) =>
	getStoredRoles().some((role) => allowedRoles.includes(role));

export const isFailureReportAdministrator = () =>
	hasStoredRole(['ADMIN', 'ADMINISTRADOR']);

export const canReportFailure = () =>
	hasStoredRole([
		'ADMIN',
		'ADMINISTRADOR',
		'OPERARIO_CAMPO',
		'OPERATIVO_CAMPO',
		'SUPERVISOR',
		'TECNICO',
	]);

export const canAssignFailureTechnician = () =>
	hasStoredRole(['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR']);

export const createFailureReport = async (formData) =>
	sendOrQueueForm({
		endpoint: '/failure-reports',
		method: 'POST',
		formData,
		operationType: 'failure_report.create',
	});
