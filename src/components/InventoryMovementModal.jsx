import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Package, Plus, X } from 'lucide-react';
import { getCategories } from '../services/assetService';
import { getInventoryItems } from '../services/inventoryService';
import CreateCategoryForm from './CreateCategoryForm';

const inputClass = 'mt-1 w-full rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2.5 text-[12px] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400';

function Field({ label, children }) {
  return (
    <label className="block text-[11px] font-medium text-slate-300">
      {label}
      {children}
    </label>
  );
}

export default function InventoryMovementModal({
  type,
  items,
  groups = [],
  groupId,
  form,
  setForm,
  onSubmit,
  onClose,
  saving,
  error,
  groupName,
  scoped,
}) {
  const isEntry = type === 'entrada';
  const Icon = isEntry ? ArrowDownLeft : ArrowUpRight;
  const currentScope = groupId == null ? 'central' : String(groupId);
  const [targetScope, setTargetScope] = useState(currentScope);
  const [loadedTargetItems, setLoadedTargetItems] = useState({ scope: '', items: [], error: '' });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(isEntry);
  const [categoriesError, setCategoriesError] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const targetGroupId = targetScope === 'central' ? null : Number(targetScope);
  const targetGroupName = groups.find((group) => String(group.id) === targetScope)?.name;
  const targetItems = targetScope === currentScope
    ? items
    : loadedTargetItems.scope === targetScope ? loadedTargetItems.items : [];
  const itemsLoading = targetScope !== currentScope && loadedTargetItems.scope !== targetScope;
  const itemsError = targetScope !== currentScope && loadedTargetItems.scope === targetScope
    ? loadedTargetItems.error
    : '';
  const selectedItem = targetItems.find((item) => String(item.id) === String(form.itemId));

  useEffect(() => {
    let active = true;
    if (targetScope === currentScope) return () => { active = false; };
    getInventoryItems(targetGroupId, true)
      .then((loadedItems) => {
        if (active) setLoadedTargetItems({ scope: targetScope, items: loadedItems, error: '' });
      })
      .catch((loadError) => {
        if (active) {
          setLoadedTargetItems({
            scope: targetScope,
            items: [],
            error: loadError.response?.data?.detail || loadError.response?.data?.message || loadError.message || 'No se pudo cargar el inventario de la zona.',
          });
        }
      });
    return () => { active = false; };
  }, [targetScope, currentScope, targetGroupId]);

  useEffect(() => {
    if (!isEntry) return undefined;
    let active = true;
    getCategories()
      .then((loadedCategories) => {
        if (!active) return;
        const uniqueCategories = loadedCategories.filter((category, index, all) => (
          all.findIndex((candidate) => candidate.name.trim().toLocaleLowerCase() === category.name.trim().toLocaleLowerCase()) === index
        ));
        setCategories(uniqueCategories);
        setCategoriesError('');
      })
      .catch((loadError) => {
        if (active) {
          setCategoriesError(loadError.response?.data?.detail || loadError.response?.data?.message || loadError.message || 'No se pudieron cargar las categorías.');
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, [isEntry]);

  const handleCategoryCreated = (category) => {
    setCategories((current) => {
      const existing = current.find((item) => item.name.trim().toLocaleLowerCase() === category.name.trim().toLocaleLowerCase());
      return existing ? current : [...current, category].sort((left, right) => left.name.localeCompare(right.name));
    });
    setForm((current) => ({ ...current, category: category.name }));
    setShowCategoryForm(false);
    setCategoriesError('');
  };

  const submit = (event) => onSubmit(event, targetGroupId);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-movement-title"
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 rounded-lg p-2 ${isEntry ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
              <Icon size={18} />
            </span>
            <div>
              <h2 id="inventory-movement-title" className="text-[15px] font-semibold text-white">
                Registrar {isEntry ? 'entrada' : 'salida'}
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                {scoped ? `Inventario de ${targetGroupName || (targetScope === 'central' ? 'la bodega central' : groupName || 'la zona seleccionada')}.` : 'Completa los datos del movimiento de inventario.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Cerrar"
            aria-label={`Cerrar formulario de ${isEntry ? 'entrada' : 'salida'}`}
            className="rounded-md p-1 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {scoped && (
            <section>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                Zona de inventario
              </h3>
              <Field label="Almacén / grupo *">
                <select
                  value={targetScope}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, itemId: '' }));
                    setTargetScope(event.target.value);
                  }}
                  className={inputClass}
                >
                  <option value="central">Bodega central</option>
                  {groups.filter((group) => group.active).map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </Field>
            </section>
          )}
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              Producto y cantidad
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Producto *">
                <select
                  required
                  disabled={itemsLoading || Boolean(itemsError)}
                  value={form.itemId}
                  onChange={(event) => setForm({ ...form, itemId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Selecciona un producto</option>
                  {targetItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item} · Disponible: {item.stock} {item.unit}
                    </option>
                  ))}
                  {isEntry && <option value="__new__">+ Crear producto y registrar primera entrada</option>}
                </select>
              </Field>
              <Field label={`Cantidad ${isEntry ? 'de entrada' : 'de salida'} *`}>
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  max={!isEntry && selectedItem ? selectedItem.stock : undefined}
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  placeholder="Ej. 10"
                  className={inputClass}
                />
              </Field>
            </div>
            {!isEntry && selectedItem && (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-200">
                <Package size={12} />
                Stock disponible: {selectedItem.stock} {selectedItem.unit}
              </p>
            )}
            {itemsLoading && <p className="mt-2 text-[10px] text-slate-400">Cargando productos de la zona...</p>}
            {itemsError && <p role="alert" className="mt-2 text-[10px] text-red-300">{itemsError}</p>}
            {!isEntry && !itemsLoading && targetItems.length === 0 && !itemsError && (
              <p className="mt-2 text-[10px] text-amber-200">
                No hay productos disponibles en este inventario. Registra primero una entrada.
              </p>
            )}
          </section>

          {isEntry && form.itemId === '__new__' && (
            <section className="border-t border-white/10 pt-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                Datos del nuevo producto
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre del producto *">
                  <input required maxLength="160" value={form.item} onChange={(event) => setForm({ ...form, item: event.target.value })} placeholder="Nombre" className={inputClass} />
                </Field>
                <div>
                  <Field label="Categoría *">
                    <select
                      required
                      value={form.category}
                      disabled={categoriesLoading || Boolean(categoriesError)}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">
                        {categoriesLoading ? 'Cargando categorías...' : 'Selecciona una categoría'}
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(true)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300 transition hover:text-cyan-200"
                  >
                    <Plus size={12} /> Crear categoría
                  </button>
                  {categoriesError && <p role="alert" className="mt-1 text-[10px] text-red-300">{categoriesError}</p>}
                </div>
                <Field label="Unidad *">
                  <input required maxLength="30" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="und, kg, L..." className={inputClass} />
                </Field>
                <Field label="Stock mínimo">
                  <input required type="number" min="0" step="0.001" value={form.minimum} onChange={(event) => setForm({ ...form, minimum: event.target.value })} placeholder="0" className={inputClass} />
                </Field>
              </div>
            </section>
          )}

          <section className="border-t border-white/10 pt-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              {isEntry ? 'Origen y observaciones' : 'Destino y observaciones'}
            </h3>
            <Field label={isEntry ? 'Proveedor / motivo' : 'Destino / motivo'}>
              <textarea
                maxLength="2000"
                rows={3}
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder={isEntry ? 'Proveedor, referencia u observaciones' : 'Área, responsable u observaciones'}
                className={inputClass}
              />
            </Field>
          </section>

          {error && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-white/10 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/5 disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || itemsLoading || Boolean(itemsError) || (isEntry
                ? form.itemId !== '__new__' && targetItems.length === 0
                  || form.itemId === '__new__' && (categoriesLoading || Boolean(categoriesError) || !categories.some((category) => category.name === form.category))
                : targetItems.length === 0)}
              className={`rounded-md px-4 py-2 text-[11px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isEntry ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
            >
              {saving ? 'Guardando...' : `Guardar ${isEntry ? 'entrada' : 'salida'}`}
            </button>
          </div>
        </form>
      </div>
      {showCategoryForm && (
        <CreateCategoryForm
          onCancel={() => setShowCategoryForm(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}
