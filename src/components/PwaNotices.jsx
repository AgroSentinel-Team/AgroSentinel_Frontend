import { useEffect, useState } from "react";
import { CheckCircle2, Download, RefreshCw, X } from "lucide-react";
import {
	applyPwaUpdate,
	canInstallPwa,
	isPwaUpdateAvailable,
	promptPwaInstall,
	PWA_INSTALL_AVAILABLE_EVENT,
	PWA_OFFLINE_READY_EVENT,
	PWA_UPDATE_AVAILABLE_EVENT,
} from "../services/pwaService";

const toastClass =
	"pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-sand-200 bg-surface p-3.5 text-sm text-ink-900 shadow-[var(--agro-shadow-card)]";

/**
 * Avisos de la app web: versión nueva disponible, lista para usarse sin internet,
 * e "Instalar app" en navegadores que lo permiten.
 */
export default function PwaNotices() {
	const [updateReady, setUpdateReady] = useState(isPwaUpdateAvailable);
	const [offlineReady, setOfflineReady] = useState(false);
	const [installable, setInstallable] = useState(canInstallPwa);
	const [installDismissed, setInstallDismissed] = useState(false);
	const [updating, setUpdating] = useState(false);

	useEffect(() => {
		const onUpdate = () => setUpdateReady(true);
		const onOffline = () => setOfflineReady(true);
		const onInstall = () => setInstallable(canInstallPwa());
		globalThis.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, onUpdate);
		globalThis.addEventListener(PWA_OFFLINE_READY_EVENT, onOffline);
		globalThis.addEventListener(PWA_INSTALL_AVAILABLE_EVENT, onInstall);
		return () => {
			globalThis.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, onUpdate);
			globalThis.removeEventListener(PWA_OFFLINE_READY_EVENT, onOffline);
			globalThis.removeEventListener(PWA_INSTALL_AVAILABLE_EVENT, onInstall);
		};
	}, []);

	useEffect(() => {
		if (!offlineReady) return undefined;
		const timer = setTimeout(() => setOfflineReady(false), 6000);
		return () => clearTimeout(timer);
	}, [offlineReady]);

	const showInstall = installable && !installDismissed && !updateReady;
	if (!updateReady && !offlineReady && !showInstall) return null;

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--agro-safe-bottom))] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6"
		>
			{updateReady && (
				<div role="status" className={toastClass}>
					<RefreshCw size={18} className="shrink-0 text-forest-700" aria-hidden="true" />
					<p className="min-w-0 flex-1">
						<strong className="block">Hay una nueva versión de AgroSentinel</strong>
						<span className="text-xs text-ink-600">Tu trabajo guardado no se pierde al actualizar.</span>
					</p>
					<button
						type="button"
						disabled={updating}
						onClick={async () => {
							setUpdating(true);
							await applyPwaUpdate();
						}}
						className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 text-xs font-bold text-pine-900 disabled:opacity-60"
					>
						{updating ? "Actualizando…" : "Actualizar"}
					</button>
				</div>
			)}

			{offlineReady && !updateReady && (
				<div role="status" className={toastClass}>
					<CheckCircle2 size={18} className="shrink-0 text-forest-700" aria-hidden="true" />
					<p className="min-w-0 flex-1 text-xs">
						<strong className="block text-sm">Lista para usarse sin internet</strong>
						La app web ya abre aunque no haya conexión.
					</p>
				</div>
			)}

			{showInstall && (
				<div role="status" className={toastClass}>
					<Download size={18} className="shrink-0 text-forest-700" aria-hidden="true" />
					<p className="min-w-0 flex-1 text-xs">
						<strong className="block text-sm">Instala AgroSentinel</strong>
						Ábrela como una app, con acceso directo y sin la barra del navegador.
					</p>
					<button
						type="button"
						onClick={() => void promptPwaInstall()}
						className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 text-xs font-bold text-pine-900"
					>
						Instalar
					</button>
					<button
						type="button"
						onClick={() => setInstallDismissed(true)}
						aria-label="Ahora no"
						className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-600 hover:bg-sand-100"
					>
						<X size={18} />
					</button>
				</div>
			)}
		</div>
	);
}
