import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Package, Plus, X } from 'lucide-react';
import { getCategories } from '../services/assetService';
import { getInventoryItems } from '../services/inventoryService';
import CreateCategoryForm from './CreateCategoryForm';

const inputClass =
  'mt-1 w-full rounded-lg border border-sand-200 bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 outline-none transition-all duration-200 ease-out placeholder:text-ink-600 focus-visible:border-gold-600 focus:ring-1 focus-visible:ring-gold-500/25 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed';

function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-ink-600">
      <span>{label}</span>
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
  const targetItems =
    targetScope === currentScope
      ? items
      : loadedTargetItems.scope === targetScope
      ? loadedTargetItems.items
      : [];
  const itemsLoading = targetScope !== currentScope && loadedTargetItems.scope !== targetScope;
  const itemsError =
    targetScope !== currentScope && loadedTargetItems.scope === targetScope
      ? loadedTargetItems.error
      : '';
  const selectedItem = targetItems.find((item) => String(item.id) === String(form.itemId));

  useEffect(() => {
    let active = true;
    if (targetScope === currentScope)
      return () => {
        active = false;
      };
    getInventoryItems(targetGroupId, true)
      .then((loadedItems) => {
        if (active) setLoadedTargetItems({ scope: targetScope, items: loadedItems, error: '' });
      })
      .catch((loadError) => {
        if (active) {
          setLoadedTargetItems({
            scope: targetScope,
            items: [],
            error:
              loadError.response?.data?.detail ||
              loadError.response?.data?.message ||
              loadError.message ||
              'No se pudo cargar el inventario de la zona.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [targetScope, currentScope, targetGroupId]);

  useEffect(() => {
    if (!isEntry) return undefined;
    let active = true;
    getCategories()
      .then((loadedCategories) => {
        if (!active) return;
        const uniqueCategories = loadedCategories.filter(
          (category, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.name.trim().toLocaleLowerCase() === category.name.trim().toLocaleLowerCase()
            ) === index
        );
        setCategories(uniqueCategories);
        setCategoriesError('');
      })
      .catch((loadError) => {
        if (active) {
          setCategoriesError(
            loadError.response?.data?.detail ||
              loadError.response?.data?.message ||
              loadError.message ||
              'No se pudieron cargar las categorías.'
          );
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEntry]);

  const handleCategoryCreated = (category) => {
    setCategories((current) => {
      const existing = current.find(
        (item) => item.name.trim().toLocaleLowerCase() === category.name.trim().toLocaleLowerCase()
      );
      return existing
        ? current
        : [...current, category].sort((left, right) => left.name.localeCompare(right.name));
    });
    setForm((current) => ({ ...current, category: category.name }));
    setShowCategoryForm(false);
    setCategoriesError('');
  };

  const submit = (event) => onSubmit(event, targetGroupId);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-pine-900/35 backdrop-blur-xl px-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 md:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-movement-title"
        className="relative my-auto max-h-[92dvh] w-full max-w-2xl min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition-all sm:rounded-2xl sm:p-6"
      >
        {/* Header Modal */}
        <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                isEntry
                  ? 'bg-success-soft text-forest-700 border-forest-300/50'
                  : 'bg-gold-100 text-forest-900 border-gold-300'
              }`}
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="inventory-movement-title" className="text-base sm:text-lg font-semibold text-ink-900 truncate">
                Registrar {isEntry ? 'entrada' : 'salida'}
              </h2>
              <p className="mt-0.5 text-xs text-ink-600">
                {scoped
                  ? `Inventario de ${
                      targetGroupName ||
                      (targetScope === 'central' ? 'la bodega central' : groupName || 'la zona seleccionada')
                    }.`
                  : 'Completa los datos del movimiento de inventario.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Cerrar"
            aria-label={`Cerrar formulario de ${isEntry ? 'entrada' : 'salida'}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 ease-out hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {scoped && (
            <section className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
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
                  {groups
                    .filter((group) => group.active)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </Field>
            </section>
          )}

          <section className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
              Producto y cantidad
            </h3>
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
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
              <p className="flex items-center gap-1.5 text-xs text-ocean-700 pt-1">
                <Package size={14} className="shrink-0" />
                Stock disponible: {selectedItem.stock} {selectedItem.unit}
              </p>
            )}
            {itemsLoading && <p className="text-xs text-ink-600">Cargando productos de la zona...</p>}
            {itemsError && (
              <p role="alert" className="text-xs text-error-text">
                {itemsError}
              </p>
            )}
            {!isEntry && !itemsLoading && targetItems.length === 0 && !itemsError && (
              <p className="text-xs text-ink-900">
                No hay productos disponibles en este inventario. Registra primero una entrada.
              </p>
            )}
          </section>

          {isEntry && form.itemId === '__new__' && (
            <section className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
                Datos del nuevo producto
              </h3>
              <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                <Field label="Nombre del producto *">
                  <input
                    required
                    maxLength="160"
                    value={form.item}
                    onChange={(event) => setForm({ ...form, item: event.target.value })}
                    placeholder="Nombre"
                    className={inputClass}
                  />
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
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium text-ocean-700 bg-info-soft hover:bg-ocean-300/30 active:bg-ocean-300/30 transition-all duration-200 ease-out"
                  >
                    <Plus size={14} /> Crear categoría
                  </button>
                  {categoriesError && (
                    <p role="alert" className="mt-1 text-xs text-error-text">
                      {categoriesError}
                    </p>
                  )}
                </div>

                <Field label="Unidad *">
                  <input
                    required
                    maxLength="30"
                    value={form.unit}
                    onChange={(event) => setForm({ ...form, unit: event.target.value })}
                    placeholder="und, kg, L..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Stock mínimo">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.minimum}
                    onChange={(event) => setForm({ ...form, minimum: event.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>
          )}

          <section className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
              {isEntry ? 'Origen y observaciones' : 'Destino y observaciones'}
            </h3>
            <Field label={isEntry ? 'Proveedor / motivo' : 'Destino / motivo'}>
              <textarea
                maxLength="2000"
                rows={3}
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder={isEntry ? 'Proveedor, referencia u observaciones' : 'Área, responsable u observaciones'}
                className={`${inputClass} min-h-[80px] resize-y`}
              />
            </Field>
          </section>

          {error && (
            <p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-sand-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-sand-200 px-4 text-xs font-medium text-ink-600 hover:bg-sand-100 active:bg-sand-100 disabled:opacity-50 transition-all duration-200 ease-out"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                itemsLoading ||
                Boolean(itemsError) ||
                (isEntry
                  ? (form.itemId !== '__new__' && targetItems.length === 0) ||
                    (form.itemId === '__new__' &&
                      (categoriesLoading ||
                        Boolean(categoriesError) ||
                        !categories.some((category) => category.name === form.category)))
                  : targetItems.length === 0)
              }
              className={`inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg px-5 text-xs font-medium text-ink-900 transition-all duration-200 ease-out shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${
                isEntry
                  ? 'bg-gold-500 hover:bg-gold-600 active:bg-gold-600 shadow-gold-600/20'
                  : 'bg-gold-500 hover:bg-gold-600 active:bg-gold-600 shadow-gold-600/20'
              }`}
            >
              {saving ? 'Guardando...' : `Guardar ${isEntry ? 'entrada' : 'salida'}`}
            </button>
          </div>
        </form>
      </div>

      {showCategoryForm && (
        <CreateCategoryForm onCancel={() => setShowCategoryForm(false)} onCreated={handleCategoryCreated} />
      )}
    </div>
  );
}