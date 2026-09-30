export const SESSION_EXPIRED_EVENT = 'agrosentinel:session-expired';

export function expireSession() {
	localStorage.removeItem('token');
	localStorage.removeItem('rol');
	window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}