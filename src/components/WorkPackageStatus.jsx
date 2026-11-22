import { useEffect, useState } from "react";
import { AlertTriangle, CloudDownload, CloudOff, LoaderCircle, ShieldCheck } from "lucide-react";
import useWorkPackage from "../hooks/useWorkPackage";

const RELATIVE_TIME = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function formatRelative(isoDate, now) {
	const diffSeconds = Math.round((Date.parse(isoDate) - now) / 1000);
	const abs = Math.abs(diffSeconds);
	if (abs < 60) return "hace un momento";
	if (abs < 3600) return RELATIVE_TIME.format(Math.round(diffSeconds / 60), "minute");
	if (abs < 86400) return RELATIVE_TIME.format(Math.round(diffSeconds / 3600), "hour");
	return RELATIVE_TIME.format(Math.round(diffSeconds / 86400), "day");
}

function useNow(intervalMs = 60000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(timer);
	}, [intervalMs]);
	return now;
}

/**
 * Tarjeta con el estado de la descarga offline y el botón "Descargar órdenes".
 * El técnico la usa antes de salir a campo para llevarse su trabajo.
 */
export default function WorkPackageStatus({ className = "" }) {
	const { manifest, downloading, error, download } = useWorkPackage();
	const [showDetails, setShowDetails] = useState(false);
	const now = useNow();

	const failedItems = manifest?.errors ?? [];
	const partial = manifest && !manifest.complete;
	const tone = !manifest
		? "border-gold-500/40 bg-gold-100"
		: partial
			? "border-warning/30 bg-warning-soft"
			: "border-success/20 bg-success-soft";
	const Icon = downloading ? LoaderCircle : !manifest ? CloudOff : partial ? AlertTriangle : ShieldCheck;

	return (
		<section
			aria-live="polite"
			className={`rounded-xl border p-3.5 sm:p-4 ${tone} ${className}`}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-start gap-3">
					<span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-forest-700">
						<Icon size={18} className={downloading ? "animate-spin" : ""} aria-hidden="true" />
					</span>
					<div className="min-w-0">
						<p className="text-sm font-bold text-ink-900">
							{downloading
								? "Descargando tus órdenes…"
								: !manifest
									? "Tus órdenes aún no están disponibles sin conexión"
									: partial
										? "Descarga incompleta"
										: "Órdenes disponibles sin conexión"}
						</p>
						<p className="mt-0.5 text-xs text-ink-600">
							{!manifest
								? "Descárgalas antes de salir a campo para poder verlas y llenarlas sin internet."
								: `Actualizado ${formatRelative(manifest.downloadedAt, now)} · ${manifest.counts?.failures ?? 0} falla(s) · ${manifest.counts?.preventives ?? 0} preventivo(s)`}
						</p>
						{partial && !downloading && (
							<button
								type="button"
								onClick={() => setShowDetails((value) => !value)}
								className="mt-1 text-xs font-semibold text-forest-700 underline underline-offset-2"
							>
								{showDetails ? "Ocultar detalle" : `Ver qué faltó (${failedItems.length})`}
							</button>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={download}
					disabled={downloading}
					className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 text-xs font-bold uppercase tracking-wider text-pine-900 shadow-sm shadow-gold-600/20 transition-all duration-200 hover:brightness-105 disabled:opacity-60"
				>
					{downloading ? (
						<LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
					) : (
						<CloudDownload size={16} aria-hidden="true" />
					)}
					{manifest ? "Actualizar descarga" : "Descargar órdenes"}
				</button>
			</div>

			{error && (
				<p role="alert" className="mt-3 rounded-lg border border-error/20 bg-error-soft p-2.5 text-xs text-error-text">
					{error}
				</p>
			)}

			{partial && showDetails && (
				<ul className="mt-3 space-y-1 rounded-lg bg-surface/70 p-2.5 text-xs text-ink-600">
					{failedItems.map((item) => (
						<li key={item.label}>
							<span className="font-semibold text-ink-900">{item.label}:</span> {item.message}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
