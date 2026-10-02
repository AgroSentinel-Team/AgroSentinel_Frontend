export const OPEN_PREVENTIVE_SCHEDULE_EVENT = 'agrosentinel:open-preventive-schedule';

export function requestPreventiveSchedule(predictiveAsset) {
	window.dispatchEvent(new CustomEvent(OPEN_PREVENTIVE_SCHEDULE_EVENT, { detail: predictiveAsset }));
}
