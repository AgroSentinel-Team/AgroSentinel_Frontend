import { API_ROOT, createApi } from './apiClient';
import { cachedRequest, sendOrQueueForm } from './offlineApi';

export { API_ROOT };

const assetApi = createApi(`${API_ROOT}/assets`);
const directoryApi = createApi(API_ROOT);
const predictiveApi = createApi(API_ROOT);
const failureReportApi = createApi(`${API_ROOT}/failure-reports`, false);

export const getAssets = async () =>
	cachedRequest('assets', async () => (await assetApi.get('')).data);

export const getAssignedAssets = async () => (await assetApi.get('/assigned')).data;

export const createAsset = async (asset) => (await assetApi.post('', asset)).data;

export const updateAsset = async (id, asset) => (await assetApi.put(`/${id}`, asset)).data;

export const deactivateAsset = async (id) => (await assetApi.patch(`/${id}/deactivate`)).data;

export const deleteAsset = async (id) => assetApi.delete(`/${id}`);

export const getAssetResume = async (id) => (await assetApi.get(`/${id}/resume`)).data;

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

export const getFailureReportGroups = async () =>
	cachedRequest('work-groups-options', async () => (await directoryApi.get('/work-groups/options')).data);

export const canReportFailure = () => {
	const role = (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
	return ['ADMIN', 'ADMINISTRADOR', 'OPERARIO_CAMPO', 'OPERATIVO_CAMPO'].includes(role);
};

export const createFailureReport = async (formData) =>
	sendOrQueueForm({
		endpoint: '/failure-reports',
		method: 'POST',
		formData,
		operationType: 'failure_report.create',
	});
