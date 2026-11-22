import { API_ROOT, createApi } from './apiClient';
import { cachedRequest } from './offlineApi';

const diagnosisApi = createApi(`${API_ROOT}/asset-diagnoses`);

export const getAssetDiagnoses = async (assetId) =>
	cachedRequest(`asset-diagnoses:${assetId}`, async () =>
		(await diagnosisApi.get('', { params: { assetId } })).data);

/** Diagnóstico vigente de cada activo. */
export const getLatestDiagnoses = async () =>
	cachedRequest('asset-diagnoses-latest', async () => (await diagnosisApi.get('/latest')).data);

export const createDiagnosis = async (diagnosis) => (await diagnosisApi.post('', diagnosis)).data;

export const updateDiagnosis = async (id, diagnosis) => (await diagnosisApi.put(`/${id}`, diagnosis)).data;

export const deleteDiagnosis = async (id) => diagnosisApi.delete(`/${id}`);

export const updateNeedStatus = async (needId, status) =>
	(await diagnosisApi.patch(`/needs/${needId}/status`, { status })).data;

/** order: { type: 'CORRECTIVE', groupId } o { type: 'PREVENTIVE', technicianId, scheduledAt }. */
export const createNeedOrder = async (needId, order) =>
	(await diagnosisApi.post(`/needs/${needId}/order`, order)).data;
