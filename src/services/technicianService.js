import { apiClient } from './apiClient';
import { cachedRequest, sendOrQueueJson } from './offlineApi';

export const getAssignedFailureReports = async () =>
	cachedRequest('assigned-failure-reports', async () =>
		(await apiClient.get('/failure-reports/assigned')).data);

export const getCurrentUser = async () =>
	cachedRequest('current-user', async () => (await apiClient.get('/auth/me')).data);

export const getTechnicianMaintenanceHistory = async () =>
	cachedRequest('technician-maintenance-history', async () =>
		(await apiClient.get('/maintenance-history/technician')).data);

export const getFailureAssetResume = async (failureId) =>
	cachedRequest(`failure-asset-resume:${failureId}`, async () =>
		(await apiClient.get(`/failure-reports/${failureId}/asset`)).data);

export const startFailureReview = async (failureId) =>
	sendOrQueueJson({
		endpoint: `/failure-reports/${failureId}/start-review`,
		method: 'POST',
		payload: null,
		operationType: 'failure_report.start_review',
		metadata: { failureId },
	});

export const saveFailureIntervention = async (failureId, intervention) =>
	sendOrQueueJson({
		endpoint: `/failure-reports/${failureId}/intervention`,
		method: 'PUT',
		payload: intervention,
		operationType: 'failure_report.intervention',
		metadata: { failureId },
	});
