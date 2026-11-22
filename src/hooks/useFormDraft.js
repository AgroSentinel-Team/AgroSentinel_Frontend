import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "../services/draftService";

const SAVE_DELAY_MS = 700;

/**
 * Guarda automáticamente el estado de un formulario y lo restaura al reabrirlo.
 * - `key`: identifica el formulario; con `null` (formulario cerrado) no hace nada.
 * - `value`: lo que se guarda (debe poder clonarse: texto, números, arrays, File/Blob).
 * - `onRestore`: recibe el valor guardado cuando hay un borrador previo.
 * Devuelve `restoredAt` (fecha del borrador recuperado), `clear()` para borrarlo al
 * enviar, y `discard()` para borrarlo cuando el usuario prefiere empezar de cero.
 */
export default function useFormDraft(key, value, onRestore) {
	// Se guarda junto con la clave para que un borrador de otro formulario no se muestre.
	const [restored, setRestored] = useState(null);
	const restoredAt = restored && restored.key === key ? restored.savedAt : null;
	const readyRef = useRef(false);
	const stoppedRef = useRef(false);
	const timerRef = useRef(null);
	const onRestoreRef = useRef(onRestore);

	useEffect(() => {
		onRestoreRef.current = onRestore;
	});

	useEffect(() => {
		let active = true;
		readyRef.current = false;
		stoppedRef.current = false;
		if (!key) return undefined;
		void loadDraft(key).then((draft) => {
			if (!active) return;
			if (draft) {
				onRestoreRef.current?.(draft.value);
				setRestored({ key, savedAt: draft.savedAt });
			}
			readyRef.current = true;
		});
		return () => {
			active = false;
		};
	}, [key]);

	useEffect(() => {
		if (!key || !readyRef.current || stoppedRef.current) return undefined;
		timerRef.current = setTimeout(() => {
			if (!stoppedRef.current) void saveDraft(key, value);
		}, SAVE_DELAY_MS);
		return () => clearTimeout(timerRef.current);
	}, [key, value]);

	const clear = useCallback(async () => {
		stoppedRef.current = true;
		clearTimeout(timerRef.current);
		if (key) await clearDraft(key);
	}, [key]);

	const discard = useCallback(async () => {
		clearTimeout(timerRef.current);
		if (key) await clearDraft(key);
		setRestored(null);
	}, [key]);

	return { restoredAt, clear, discard };
}
