import { useCallback, useEffect, useState } from "react";
import {
	downloadWorkPackage,
	getWorkPackageStatus,
	isWorkPackageDownloading,
	WORK_PACKAGE_CHANGED_EVENT,
} from "../services/workPackageService";

/** Estado de la descarga offline del técnico, compartido entre pantallas. */
export default function useWorkPackage() {
	const [manifest, setManifest] = useState(null);
	const [downloading, setDownloading] = useState(isWorkPackageDownloading);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		void getWorkPackageStatus().then((status) => {
			if (active) setManifest(status);
		});
		const handleChange = (event) => {
			if (!active) return;
			const detail = event.detail ?? {};
			setDownloading(Boolean(detail.downloading));
			if (detail.manifest) {
				setManifest(detail.manifest);
				setError("");
			}
			if (detail.error) setError(detail.error);
		};
		globalThis.addEventListener(WORK_PACKAGE_CHANGED_EVENT, handleChange);
		return () => {
			active = false;
			globalThis.removeEventListener(WORK_PACKAGE_CHANGED_EVENT, handleChange);
		};
	}, []);

	const download = useCallback(async () => {
		setError("");
		try {
			await downloadWorkPackage();
		} catch (downloadError) {
			setError(downloadError.message || "No se pudieron descargar las órdenes.");
		}
	}, []);

	return { manifest, downloading, error, download };
}
