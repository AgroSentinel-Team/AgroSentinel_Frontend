import axios from 'axios';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function createApi(baseURL) {
	const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
	api.interceptors.request.use((config) => {
		const token = localStorage.getItem('token');
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	});
	api.interceptors.response.use((response) => response, (error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('token');
			localStorage.removeItem('rol');
			if (window.location.pathname !== '/login') window.location.assign('/login');
		}
		return Promise.reject(error);
	});
	return api;
}

const assetApi = createApi(`${API_ROOT}/assets`);
const directoryApi = createApi(API_ROOT);

export const getAssets = async () => (await assetApi.get('')).data;

export const createAsset = async (asset) => (await assetApi.post('', asset)).data;

export const updateAsset = async (id, asset) => (await assetApi.put(`/${id}`, asset)).data;

export const deactivateAsset = async (id) => (await assetApi.patch(`/${id}/deactivate`)).data;

export const deleteAsset = async (id) => assetApi.delete(`/${id}`);

export const getAssetResume = async (id) => (await assetApi.get(`/${id}/resume`)).data;

export const getCategories = async () => (await directoryApi.get('/categories')).data;

export const createCategory = async (category) => (await directoryApi.post('/categories', category)).data;

export const getUsers = async () => (await directoryApi.get('/users')).data;