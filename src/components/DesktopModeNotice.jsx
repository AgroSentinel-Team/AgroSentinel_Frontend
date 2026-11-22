import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { MonitorSmartphone, X } from "lucide-react";

const DISMISS_KEY = "agro-desktop-mode-notice-dismissed";

/*
 * Chrome en Android con "Sitio para computadoras" activado ignora la etiqueta viewport
 * y dibuja la página a ~980 px; luego la reduce para que quepa, y todo se ve diminuto
 * con el diseño de escritorio. Desde la página no se puede anular, así que se detecta
 * (pantalla táctil de teléfono con un ancho de página mucho mayor que el de la pantalla)
 * y se explica cómo desactivarlo.
 */
function isPhoneInDesktopMode() {
	if (Capacitor.isNativePlatform() || typeof window === "undefined") return false;
	const touch = navigator.maxTouchPoints > 0 || window.matchMedia?.("(pointer: coarse)").matches;
	const screenShortSide = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
	if (!touch || !screenShortSide || screenShortSide >= 600) return false;
	return window.innerWidth >= 900 && window.innerWidth > screenShortSide * 1.6;
}

function readDismissed() {
	try {
		return sessionStorage.getItem(DISMISS_KEY) === "1";
	} catch {
		return false;
	}
}

export default function DesktopModeNotice() {
	const [desktopMode, setDesktopMode] = useState(isPhoneInDesktopMode);
	const [dismissed, setDismissed] = useState(readDismissed);

	useEffect(() => {
		const update = () => setDesktopMode(isPhoneInDesktopMode());
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	if (!desktopMode || dismissed) return null;

	// La página está reducida: se agranda el aviso en la misma proporción para que se lea.
	const scale = Math.max(1, window.innerWidth / Math.min(window.screen.width, window.screen.height));

	const dismiss = () => {
		setDismissed(true);
		try {
			sessionStorage.setItem(DISMISS_KEY, "1");
		} catch {
			// Sin almacenamiento: el aviso vuelve a salir al recargar.
		}
	};

	return (
		<div
			role="alert"
			className="sticky top-0 z-[95] border-b border-gold-500/40 bg-gold-100 text-ink-900"
			style={{ fontSize: `${14 * scale}px` }}
		>
			<div className="mx-auto flex max-w-5xl items-start gap-[0.75em] p-[0.9em]">
				<MonitorSmartphone aria-hidden="true" className="mt-[0.1em] size-[1.5em] shrink-0 text-forest-700" />
				<p className="min-w-0 flex-1 leading-snug">
					<strong className="block">Estás viendo la versión de escritorio</strong>
					Para ver AgroSentinel adaptado al celular, abre el menú <strong>⋮</strong> de Chrome y desmarca{" "}
					<strong>«Sitio para computadoras»</strong>.
				</p>
				<button
					type="button"
					onClick={dismiss}
					aria-label="Cerrar aviso"
					className="inline-flex size-[2.4em] shrink-0 items-center justify-center rounded-[0.6em] hover:bg-gold-500/20"
				>
					<X aria-hidden="true" className="size-[1.2em]" />
				</button>
			</div>
		</div>
	);
}
