import { useCallback, useEffect, useState } from "react";
import {
	AlertTriangle,
	Clock3,
	Copy,
	Image as ImageIcon,
	LoaderCircle,
	RefreshCw,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { OFFLINE_QUEUE_CHANGED_EVENT } from "../services/offlineDatabase";
import {
	describeOperation,
	discardQueuedOperation,
	getQueuedOperations,
	retryQueuedOperation,
	syncPendingOfflineOperations,
} from "../services/offlineSync";
import { Button, Modal } from "./ui";

function formatDate(value) {
	return value ? new Date(value).toLocaleString("es-CO") : "—";
}

function OperationRow({ operation, onRetry, onDiscard, busy }) {
	const [confirmingDiscard, setConfirmingDiscard] = useState(false);
	const [copied, setCopied] = useState(false);
	const conflict = operation.status === "conflict";
	const photos = operation.files?.length ?? 0;

	const copyData = async () => {
		const text = `${describeOperation(operation)}\n${JSON.stringify(operation.payload ?? {}, null, 2)}`;
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	};

	return (
		<li
			className={`space-y-2 rounded-xl border p-3.5 ${
				conflict ? "border-error/30 bg-error-soft" : "border-sand-200 bg-sand-50"
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="text-sm font-bold text-ink-900">{describeOperation(operation)}</p>
					<p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
						<span className="inline-flex items-center gap-1">
							<Clock3 size={12} aria-hidden="true" /> {formatDate(operation.createdAt)}
						</span>
						{photos > 0 && (
							<span className="inline-flex items-center gap-1">
								<ImageIcon size={12} aria-hidden="true" /> {photos} foto(s)
							</span>
						)}
						{operation.attempts > 0 && <span>{operation.attempts} intento(s)</span>}
					</p>
				</div>
				<span
					className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
						conflict ? "bg-error text-white" : "bg-gold-100 text-ink-900"
					}`}
				>
					{conflict ? "Rechazada" : "Pendiente"}
				</span>
			</div>

			{operation.lastError && (
				<p className={`text-xs ${conflict ? "font-semibold text-error-text" : "text-ink-600"}`}>
					{conflict ? "El servidor respondió: " : "Último intento: "}
					{operation.lastError}
				</p>
			)}

			<div className="flex flex-wrap gap-2 pt-1">
				{conflict && (
					<Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />} disabled={busy} onClick={() => onRetry(operation)}>
						Reintentar
					</Button>
				)}
				<Button size="sm" variant="ghost" leftIcon={<Copy size={14} />} onClick={copyData}>
					{copied ? "Copiado" : "Copiar datos"}
				</Button>
				{conflict &&
					(confirmingDiscard ? (
						<>
							<Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} disabled={busy} onClick={() => onDiscard(operation)}>
								Sí, descartar
							</Button>
							<Button size="sm" variant="ghost" onClick={() => setConfirmingDiscard(false)}>
								No
							</Button>
						</>
					) : (
						<Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => setConfirmingDiscard(true)}>
							Descartar
						</Button>
					))}
			</div>
			{confirmingDiscard && (
				<p className="text-xs text-ink-600">
					Se borrará del dispositivo y no se podrá recuperar. Copia los datos antes si los necesitas.
				</p>
			)}
		</li>
	);
}

/** Lista de lo que está guardado en el dispositivo esperando enviarse al servidor. */
export default function SyncQueueModal({ isOpen, onClose, online }) {
	const [operations, setOperations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");

	const load = useCallback(async () => {
		try {
			setOperations(await getQueuedOperations());
		} catch (error) {
			setMessage(error.message || "No se pudo leer la cola del dispositivo.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!isOpen) return undefined;
		void Promise.resolve().then(load);
		const handleChange = () => void load();
		globalThis.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleChange);
		return () => globalThis.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleChange);
	}, [isOpen, load]);

	const run = async (task, successMessage) => {
		setBusy(true);
		setMessage("");
		try {
			const result = await task();
			if (result?.error) setMessage(`Se reintentará más tarde: ${result.error}`);
			else if (successMessage) setMessage(successMessage);
		} catch (error) {
			setMessage(error.message || "No se pudo completar la acción.");
		} finally {
			setBusy(false);
			await load();
		}
	};

	const conflicts = operations.filter((operation) => operation.status === "conflict").length;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Pendientes de sincronizar"
			description="Trabajo guardado en este dispositivo que todavía no llega al servidor."
			size="md"
			footer={
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="ghost" onClick={onClose}>
						Cerrar
					</Button>
					<Button
						leftIcon={busy ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
						disabled={busy || !online || operations.length === conflicts}
						onClick={() => run(syncPendingOfflineOperations, "Sincronización terminada.")}
					>
						Sincronizar ahora
					</Button>
				</div>
			}
		>
			{conflicts > 0 && (
				<div className="mb-4 flex gap-2.5 rounded-xl border border-error/20 bg-error-soft p-3 text-xs text-error-text">
					<AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
					<p>
						<strong>{conflicts} operación(es) rechazada(s) por el servidor.</strong> Revisa el motivo: si se
						corrigió (por ejemplo, el supervisor reasignó la orden o llegó stock), pulsa Reintentar. Las demás
						operaciones de la misma orden esperan hasta que la resuelvas.
					</p>
				</div>
			)}
			{!online && (
				<p className="mb-4 rounded-xl border border-sand-200 bg-sand-100 p-3 text-xs text-ink-600">
					Sin conexión. Todo esto se enviará solo cuando vuelva internet.
				</p>
			)}
			{message && (
				<p role="status" className="mb-4 rounded-xl border border-sand-200 bg-surface p-3 text-xs text-ink-900">
					{message}
				</p>
			)}

			{loading ? (
				<div className="py-10 text-center text-xs text-ink-600">
					<LoaderCircle size={22} className="mx-auto mb-2 animate-spin" aria-hidden="true" />
					Leyendo la cola del dispositivo…
				</div>
			) : operations.length === 0 ? (
				<p className="py-10 text-center text-sm text-ink-600">Todo está sincronizado.</p>
			) : (
				<ul className="space-y-3">
					{operations.map((operation) => (
						<OperationRow
							key={operation.id}
							operation={operation}
							busy={busy}
							onRetry={(item) => run(() => retryQueuedOperation(item.id), "Operación reenviada.")}
							onDiscard={(item) => run(() => discardQueuedOperation(item), "Operación descartada.")}
						/>
					))}
				</ul>
			)}
		</Modal>
	);
}
