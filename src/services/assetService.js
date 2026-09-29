import axios from 'axios';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function createApi(baseURL) {
	const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
	api.interceptors.request.use((config) => {
		const token = localStorage.getItem('token');
		if (token && token.split('.').length !== 3) {
			return Promise.reject(new Error('El token guardado no tiene formato JWT. La sesión se mantiene abierta.'));
		}
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	});
	return api;
}

const assetApi = createApi(`${API_ROOT}/assets`);
const directoryApi = createApi(API_ROOT);
const predictiveApi = createApi(API_ROOT);

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