import { API_ROOT, createApi } from './apiClient';

export { API_ROOT };

const assetApi = createApi(`${API_ROOT}/assets`);
const directoryApi = createApi(API_ROOT);
const predictiveApi = createApi(API_ROOT);
const failureReportApi = createApi(`${API_ROOT}/failure-reports`, false);

export const getAssets = async () => (await assetApi.get('')).data;

export const createAsset = async (asset) => (await assetApi.post('', asset)).data;

export const updateAsset = async (id, asset) => (await assetApi.put(`/${id}`, asset)).data;

export const deactivateAsset = async (id) => (await assetApi.patch(`/${id}/deactivate`)).data;

export const deleteAsset = async (id) => assetApi.delete(`/${id}`);

export const getAssetResume = async (id) => (await assetApi.get(`/${id}/resume`)).data;

export const getPredictiveAssets = async () => (await predictiveApi.get('/predictive/assets')).data;

export const getPredictiveHistory = async (id) => (await predictiveApi.get(`/predictive/assets/${id}/history`)).data;

export const getCategories = async () => (await directoryApi.get('/categories')).data;

export const createCategory = async (category) => (await directoryApi.post('/categories', category)).data;

export const getUsers = async () => (await directoryApi.get('/users')).data;

export const getFailureReportAssets = async () => (await failureReportApi.get('/assets')).data;

export const getFailureReports = async () => (await failureReportApi.get('')).data;

export const createFailureReport = async (formData) => (await failureReportApi.post('', formData)).data;

export const canReportFailure = () => {
	const role = (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
	return ['ADMIN', 'ADMINISTRADOR', 'OPERARIO_CAMPO', 'OPERATIVO_CAMPO'].includes(role);
};
