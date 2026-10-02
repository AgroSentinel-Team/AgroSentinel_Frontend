export const SESSION_EXPIRED_EVENT = 'agrosentinel:session-expired';

export function hasUnexpiredToken(token) {
	if (!token || token.split('.').length !== 3) return false;
	try {
		const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
		const claims = JSON.parse(atob(paddedPayload));
		return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
	} catch {
		return false;
	}
}

export function expireSession() {
	localStorage.removeItem('token');
	localStorage.removeItem('rol');
	window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function expireSessionIfTokenExpired() {
	if (hasUnexpiredToken(localStorage.getItem('token'))) return false;
	expireSession();
	return true;
}
