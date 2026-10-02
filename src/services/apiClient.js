import axios from 'axios';
import { expireSession, expireSessionIfTokenExpired, hasUnexpiredToken } from './sessionService';

export const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

export function createApi(baseURL = API_ROOT, json = true) {
	const api = axios.create({
		baseURL,
		...(json ? { headers: { 'Content-Type': 'application/json' } } : {}),
	});

	api.interceptors.request.use((config) => {
		const token = localStorage.getItem('token');
		if (token && !hasUnexpiredToken(token)) {
			expireSession();
			return Promise.reject(new Error('La sesión finalizó. Inicia sesión de nuevo.'));
		}
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	});

	api.interceptors.response.use(
		(response) => response,
		(error) => {
			if (error.response?.status === 401) {
				const serverMessage = error.response.data?.message || '';
				const serverRejectedToken = /token es inválido o venció|cuenta asociada al token/i.test(serverMessage);
				if (serverRejectedToken) {
					expireSession();
				} else if (!expireSessionIfTokenExpired()) {
					error.message = serverMessage
						? `El servidor rechazó la solicitud (401): ${serverMessage}`
						: 'El servidor rechazó la solicitud (401). Tu sesión vigente se conservó; verifica la autorización del endpoint.';
				}
			}
			return Promise.reject(error);
		},
	);

	return api;
}

export const apiClient = createApi();
