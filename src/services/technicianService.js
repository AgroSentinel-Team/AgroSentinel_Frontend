import { apiClient } from './apiClient';

export const getAssignedFailureReports = async () =>
	(await apiClient.get('/failure-reports/assigned')).data;

export const getCurrentUser = async () => (await apiClient.get('/auth/me')).data;

export const getTechnicianMaintenanceHistory = async () =>
	(await apiClient.get('/maintenance-history/technician')).data;

export const getFailureAssetResume = async (failureId) =>
	(await apiClient.get(`/failure-reports/${failureId}/asset`)).data;

export const startFailureReview = async (failureId) =>
	(await apiClient.post(`/failure-reports/${failureId}/start-review`)).data;

export const saveFailureIntervention = async (failureId, intervention) =>
	(await apiClient.put(`/failure-reports/${failureId}/intervention`, intervention)).data;
