import { useSyncExternalStore } from "react";

const STORAGE_KEY = "agro-theme";
const THEME_COLORS = { light: "#0f2e22", dark: "#0a1828" };
const listeners = new Set();

function readStoredTheme() {
	try {
		const value = globalThis.localStorage?.getItem(STORAGE_KEY);
		return value === "dark" || value === "light" ? value : null;
	} catch {
		return null;
	}
}

export function getTheme() {
	const current = globalThis.document?.documentElement.dataset.theme;
	if (current === "dark" || current === "light") return current;
	return readStoredTheme() ?? "light";
}

function applyTheme(theme) {
	const root = globalThis.document?.documentElement;
	if (!root) return;
	root.dataset.theme = theme;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", THEME_COLORS[theme]);
}

export function setTheme(theme) {
	const next = theme === "dark" ? "dark" : "light";
	applyTheme(next);
	try {
		globalThis.localStorage?.setItem(STORAGE_KEY, next);
	} catch {
		// Sin almacenamiento disponible: el tema solo dura esta sesión.
	}
	listeners.forEach((listener) => listener());
}

export function toggleTheme() {
	setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Aplica el tema guardado al arrancar (index.html ya lo hace antes del primer render). */
export function initTheme() {
	applyTheme(readStoredTheme() ?? "light");
}

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
	return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}
