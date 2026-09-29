import { useState } from 'react';
import { X } from 'lucide-react';
import { createCategory } from '../services/assetService';

const fieldClass = 'mt-1 w-full rounded-md border border-white/10 bg-[#081723] px-3 py-2 text-[12px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400';

function describeError(error) {
	return error.response?.data?.detail
		|| error.response?.data?.message
		|| (typeof error.response?.data === 'string' ? error.response.data : '')
		|| error.message
		|| 'No se pudo guardar la categoría.';
}

export default function CreateCategoryForm({ onCreated, onCancel }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	const submit = async (event) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			const category = await createCategory({ name: name.trim(), description: description.trim() });
			onCreated(category);
		} catch (requestError) {
			setError(describeError(requestError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" role="presentation">
			<div role="dialog" aria-modal="true" aria-labelledby="category-form-title" className="w-full max-w-md rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl">
				<div className="mb-5 flex items-start justify-between gap-3">
					<div>
						<h3 id="category-form-title" className="text-[15px] font-semibold text-white">Nueva categoría</h3>
						<p className="mt-1 text-[10px] text-slate-400">La categoría quedará activa para asignarla a activos.</p>
					</div>
					<button type="button" onClick={onCancel} title="Cerrar" aria-label="Cerrar formulario de categoría" className="text-slate-400 hover:text-white"><X size={18} /></button>
				</div>
				<form onSubmit={submit} className="space-y-4">
					<label className="block text-[11px] text-slate-300">
						Nombre *
						<input autoFocus required maxLength="120" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
					</label>
					<label className="block text-[11px] text-slate-300">
						Descripción
						<textarea rows="3" maxLength="500" value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} />
					</label>
					{error && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}
					<div className="flex justify-end gap-2 border-t border-white/10 pt-4">
						<button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/5">Cancelar</button>
						<button type="submit" disabled={saving} className="rounded-md bg-cyan-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-cyan-500 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar categoría'}</button>
					</div>
				</form>
			</div>
		</div>
	);
}