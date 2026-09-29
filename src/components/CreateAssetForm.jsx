import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createAsset, getCategories, getUsers, updateAsset } from '../services/assetService';
import CreateCategoryForm from './CreateCategoryForm';

const EMPTY_FORM = {
	name: '',
	brand: '',
	model: '',
	serialNumber: '',
	extraSpecifications: '',
	categoryId: '',
	responsibleId: '',
	acquisitionDate: '',
	acquisitionCost: '',
	provider: '',
	warrantyExpirationDate: '',
	location: '',
	operationalStatus: 'OPERATIONAL',
	isActive: true,
};

const STATUS_LABELS = {
	OPERATIONAL: 'Operativo',
	IN_REPAIR: 'En reparación',
	OBSOLETE: 'Obsoleto',
};

const fieldClass = 'mt-1 w-full rounded-md border border-white/10 bg-[#081723] px-3 py-2 text-[12px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400';

function describeError(error) {
	if (error.response?.status === 403) {
		return 'Acceso denegado. Cierra sesión e inicia sesión de nuevo con una cuenta Administrador.';
	}
	if (error.response?.status === 401) {
		return 'La sesión expiró. Inicia sesión de nuevo.';
	}
	return error.response?.data?.detail
		|| error.response?.data?.message
		|| (typeof error.response?.data === 'string' ? error.response.data : '')
		|| error.message
		|| 'Ocurrió un error al comunicarse con el servidor.';
}

function getInitialForm(asset) {
	if (!asset) return EMPTY_FORM;
	return {
		...EMPTY_FORM,
		...asset,
		categoryId: String(asset.categoryId),
		responsibleId: String(asset.responsibleId),
		acquisitionDate: asset.acquisitionDate || '',
		acquisitionCost: asset.acquisitionCost ?? '',
		warrantyExpirationDate: asset.warrantyExpirationDate || '',
	};
}

function InputField({ label, name, value, onChange, type = 'text', required = false, min, step }) {
	return (
		<label className="block text-[11px] text-slate-300">
			{label}
			<input className={fieldClass} name={name} type={type} value={value ?? ''} onChange={onChange} required={required} min={min} step={step} />
		</label>
	);
}

export default function CreateAssetForm({ asset = null, onCancel, onSaved }) {
	const [form, setForm] = useState(() => getInitialForm(asset));
	const [categories, setCategories] = useState([]);
	const [users, setUsers] = useState([]);
	const [loadingOptions, setLoadingOptions] = useState(true);
	const [optionsError, setOptionsError] = useState('');
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);
	const [showCategoryForm, setShowCategoryForm] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.all([getCategories(), getUsers()])
			.then(([categoryOptions, userOptions]) => {
				if (cancelled) return;
				setCategories(categoryOptions);
				setUsers(userOptions);
			})
			.catch((error) => {
				if (!cancelled) setOptionsError(describeError(error));
			})
			.finally(() => {
				if (!cancelled) setLoadingOptions(false);
			});
		return () => { cancelled = true; };
	}, []);

	const changeForm = (event) => {
		const { name, value, type, checked } = event.target;
		setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
	};

	const handleCategoryCreated = (category) => {
		setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
		setForm((current) => ({ ...current, categoryId: String(category.id) }));
		setShowCategoryForm(false);
	};

	const submit = async (event) => {
		event.preventDefault();
		setSaving(true);
		setFormError('');
		const payload = {
			...form,
			categoryId: Number(form.categoryId),
			responsibleId: Number(form.responsibleId),
			acquisitionCost: form.acquisitionCost === '' ? null : Number(form.acquisitionCost),
		};
		try {
			const saved = asset ? await updateAsset(asset.id, payload) : await createAsset(payload);
			onSaved(saved);
		} catch (error) {
			setFormError(describeError(error));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation">
			<div role="dialog" aria-modal="true" aria-labelledby="asset-form-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl">
				<div className="mb-5 flex items-start justify-between gap-3">
					<div><h3 id="asset-form-title" className="text-[15px] font-semibold text-white">{asset ? 'Editar activo' : 'Registrar activo'}</h3><p className="mt-1 text-[10px] text-slate-400">Completa la ficha, compra, asignación y estado.</p></div>
					<button type="button" onClick={onCancel} title="Cerrar" aria-label="Cerrar formulario de activo" className="text-slate-400 hover:text-white"><X size={18} /></button>
				</div>
				{optionsError && <p role="alert" className="mb-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">No se pudieron cargar categorías y usuarios: {optionsError}</p>}
				<form onSubmit={submit} className="space-y-5">
					<div>
						<h4 className="mb-3 text-[10px] font-semibold uppercase text-cyan-300">Ficha técnica</h4>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<InputField label="Nombre *" name="name" value={form.name} onChange={changeForm} required />
							<InputField label="Marca" name="brand" value={form.brand} onChange={changeForm} />
							<InputField label="Modelo" name="model" value={form.model} onChange={changeForm} />
							<InputField label="Número de serie" name="serialNumber" value={form.serialNumber} onChange={changeForm} />
							<label className="block text-[11px] text-slate-300">Categoría *
								<select name="categoryId" value={form.categoryId} onChange={changeForm} required disabled={loadingOptions || !categories.length} className={fieldClass}>
									<option value="">{loadingOptions ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
									{asset && !categories.some((category) => String(category.id) === String(asset.categoryId)) && <option value={String(asset.categoryId)}>{asset.categoryName} (inactiva)</option>}
									{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
								</select>
								<button type="button" onClick={() => setShowCategoryForm(true)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200"><Plus size={12} /> Crear categoría</button>
							</label>
							<label className="block text-[11px] text-slate-300">Responsable *
								<select name="responsibleId" value={form.responsibleId} onChange={changeForm} required disabled={loadingOptions || !users.length} className={fieldClass}>
									<option value="">{loadingOptions ? 'Cargando usuarios...' : 'Selecciona un responsable'}</option>
									{users.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
								</select>
							</label>
						</div>
						<label className="mt-3 block text-[11px] text-slate-300">Especificaciones adicionales (texto o JSON)
							<textarea name="extraSpecifications" value={form.extraSpecifications} onChange={changeForm} rows="3" className={fieldClass} />
						</label>
					</div>
					<div>
						<h4 className="mb-3 text-[10px] font-semibold uppercase text-cyan-300">Adquisición y garantía</h4>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<InputField label="Fecha de adquisición" name="acquisitionDate" value={form.acquisitionDate} onChange={changeForm} type="date" />
							<InputField label="Costo de adquisición" name="acquisitionCost" value={form.acquisitionCost} onChange={changeForm} type="number" min="0" step="0.01" />
							<InputField label="Proveedor" name="provider" value={form.provider} onChange={changeForm} />
							<InputField label="Vencimiento de garantía" name="warrantyExpirationDate" value={form.warrantyExpirationDate} onChange={changeForm} type="date" />
							<InputField label="Ubicación" name="location" value={form.location} onChange={changeForm} />
							<label className="block text-[11px] text-slate-300">Estado operativo
								<select name="operationalStatus" value={form.operationalStatus} onChange={changeForm} className={fieldClass}>
									{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
								</select>
							</label>
						</div>
					</div>
					<label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
						<input type="checkbox" name="isActive" checked={Boolean(form.isActive)} onChange={changeForm} className="accent-cyan-500" /> Activo
					</label>
					{formError && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{formError}</p>}
					<div className="flex justify-end gap-2 border-t border-white/10 pt-4">
						<button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/5">Cancelar</button>
						<button type="submit" disabled={saving || loadingOptions || Boolean(optionsError) || !categories.length || !users.length} className="rounded-md bg-cyan-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-cyan-500 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar activo'}</button>
					</div>
				</form>
			</div>
			{showCategoryForm && <CreateCategoryForm onCancel={() => setShowCategoryForm(false)} onCreated={handleCategoryCreated} />}
		</div>
	);
}