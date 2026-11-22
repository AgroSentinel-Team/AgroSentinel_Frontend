import { API_ROOT, createApi } from './apiClient';
import { cachedRequest } from './offlineApi';

const settingsApi = createApi(`${API_ROOT}/report-settings`);

/**
 * Textos y datos institucionales por defecto del informe técnico. Son genéricos: cada
 * institución los ajusta (y agrega sus logos) desde "Configurar informe".
 */
export const DEFAULT_REPORT_SETTINGS = {
	institutionName: '',
	unitName: '',
	farmName: '',
	logoPrimary: null,
	logoSecondary: null,
	footerText: '',
	reportTitle: 'Informe técnico de diagnóstico del estado general de la maquinaria e implementos agrícolas',
	introduction:
		'El presente informe técnico documenta el estado general de la maquinaria, equipos e implementos agrícolas disponibles. ' +
		'La evaluación busca establecer las condiciones actuales de operación, identificar necesidades de mantenimiento, ' +
		'reparación o recuperación y determinar, cuando corresponda, los equipos que requieren evaluación para una eventual baja.',
	generalObjective:
		'Realizar un diagnóstico técnico del estado general de la maquinaria, equipos e implementos agrícolas, identificando su ' +
		'condición operativa, necesidades de mantenimiento, posibilidades de recuperación y los casos que requieran evaluación ' +
		'para una eventual baja.',
	specificObjectives: [
		'Identificar y documentar las condiciones actuales de funcionamiento de cada equipo.',
		'Registrar las necesidades de mantenimiento preventivo y correctivo.',
		'Establecer prioridades de intervención para conservar la capacidad operativa.',
		'Identificar equipos fuera de servicio que puedan ser recuperables.',
		'Señalar los equipos que requieren evaluación técnica y económica para determinar una eventual baja.',
		'Generar un documento técnico de soporte para la programación de mantenimiento, recuperación y gestión de los activos.',
	].join('\n'),
	methodology:
		'El diagnóstico se estructuró a partir de la inspección y verificación del estado de cada equipo. Para cada activo se ' +
		'registraron, cuando estuvieron disponibles, marca, modelo o referencia, serial, código de inventario, condición de ' +
		'operación y necesidades identificadas. La clasificación considera tres condiciones principales: equipos operativos en ' +
		'buen estado, equipos operativos que requieren mantenimiento y equipos fuera de servicio que requieren recuperación o ' +
		'evaluación para baja.\n\nLa recomendación de baja no constituye por sí misma la disposición definitiva del activo; en los ' +
		'casos correspondientes se debe realizar la evaluación técnica, económica, contable y patrimonial y adelantar el ' +
		'procedimiento institucional establecido.',
	finalObservation:
		'Los equipos clasificados como fuera de servicio, obsoletos o recomendados para evaluación de baja no deben considerarse ' +
		'dados de baja únicamente con fundamento en este informe técnico. La baja definitiva deberá estar soportada por la ' +
		'evaluación técnica y económica correspondiente y adelantarse conforme a los procedimientos administrativos, contables y ' +
		'patrimoniales vigentes.',
	generalRecommendations: [
		'Priorizar las intervenciones que comprometen la seguridad de los operadores, especialmente llantas, sistemas de transmisión, elementos estructurales y componentes de acople.',
		'Implementar un programa de mantenimiento preventivo para los equipos operativos.',
		'Registrar en cada intervención la fecha, horas de trabajo, repuestos utilizados y responsable del mantenimiento.',
		'Mantener actualizados los códigos de inventario, seriales, ubicación y estado de cada activo.',
		'Realizar evaluación técnico-económica previa a cualquier recomendación definitiva de baja.',
		'Conservar evidencia fotográfica de los equipos antes y después de las intervenciones.',
	].join('\n'),
	photoCaption: 'Fuente: registro fotográfico del equipo.',
	preparedBy: '',
	preparedByRole: '',
};

export function withDefaults(settings) {
	const merged = { ...DEFAULT_REPORT_SETTINGS };
	Object.entries(settings || {}).forEach(([key, value]) => {
		if (key in DEFAULT_REPORT_SETTINGS && value !== undefined && value !== null) merged[key] = value;
	});
	return merged;
}

export const getReportSettings = async () =>
	withDefaults(await cachedRequest('report-settings', async () => (await settingsApi.get('')).data));

export const saveReportSettings = async (settings) => withDefaults((await settingsApi.put('', settings)).data);

/** Convierte una imagen elegida por el usuario en PNG liviano (máx. 600 px) para guardarla como logo. */
export function imageFileToDataUrl(file, maxSize = 600) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(image.width * scale);
			canvas.height = Math.round(image.height * scale);
			canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL('image/png'));
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('No se pudo leer la imagen.'));
		};
		image.src = url;
	});
}

/**
 * Descarga una foto y la convierte en JPEG (jsPDF no acepta WEBP) con sus dimensiones.
 * Devuelve null si no se puede obtener: la ficha se genera sin foto.
 */
export async function loadPhotoForPdf(url, maxSize = 1400) {
	if (!url) return null;
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		const blob = await response.blob();
		const bitmapUrl = URL.createObjectURL(blob);
		try {
			const image = await new Promise((resolve, reject) => {
				const element = new Image();
				element.onload = () => resolve(element);
				element.onerror = reject;
				element.src = bitmapUrl;
			});
			const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(image.width * scale);
			canvas.height = Math.round(image.height * scale);
			const context = canvas.getContext('2d');
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			return { dataUrl: canvas.toDataURL('image/jpeg', 0.82), width: canvas.width, height: canvas.height };
		} finally {
			URL.revokeObjectURL(bitmapUrl);
		}
	} catch {
		return null;
	}
}
