import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNetworkAvailable: vi.fn(),
  ensureFreshToken: vi.fn(),
  sync: vi.fn(),
  failures: vi.fn(),
  preventives: vi.fn(),
  resume: vi.fn(),
  inventory: vi.fn(),
}));

vi.mock('../src/services/offlineNetwork.js', () => ({ isNetworkAvailable: mocks.isNetworkAvailable }));
vi.mock('../src/services/offlineSync.js', () => ({ syncPendingOfflineOperations: mocks.sync }));
vi.mock('../src/services/sessionService.js', () => ({
  ensureFreshToken: mocks.ensureFreshToken,
  getSessionOwnerKey: () => 'tecnico@example.com',
  isOfflineAuthenticated: () => false,
}));
vi.mock('../src/services/apiClient.js', () => ({
  API_ROOT: 'http://localhost/api',
  createApi: () => ({}),
  withoutAccessDeniedRedirect: (task) => task(),
}));
vi.mock('../src/services/technicianService.js', () => ({
  getAssignedFailureReports: mocks.failures,
  getCurrentUser: vi.fn().mockResolvedValue({ nombre: 'Técnico' }),
  getFailureAssetResume: mocks.resume,
  getTechnicianMaintenanceHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock('../src/services/preventiveMaintenanceService.js', () => ({
  getPreventiveMaintenances: mocks.preventives,
}));
vi.mock('../src/services/inventoryService.js', () => ({
  getInventoryGroups: vi.fn().mockResolvedValue([{ id: 4, name: 'Zona norte' }]),
  getAllWorkGroups: vi.fn().mockResolvedValue([{ id: 4 }, { id: 9 }]),
  getInventoryItems: mocks.inventory,
}));
vi.mock('../src/services/assetService.js', () => ({
  getAssets: vi.fn().mockResolvedValue([]),
  getCategories: vi.fn().mockResolvedValue([]),
  getPredictiveAssets: vi.fn().mockResolvedValue([]),
  getAssignedAssets: vi.fn().mockResolvedValue([{ id: 31 }]),
  getPredictiveHistory: vi.fn().mockResolvedValue([]),
}));

globalThis.indexedDB = indexedDB;

const workPackage = await import('../src/services/workPackageService.js');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isNetworkAvailable.mockResolvedValue(true);
  mocks.ensureFreshToken.mockResolvedValue('token');
  mocks.sync.mockResolvedValue({ successful: 0, failed: 0 });
  mocks.failures.mockResolvedValue([
    { id: 11, estado: 'ASIGNADA', workGroupId: 7 },
    { id: 12, estado: 'EN_EJECUCION' },
    { id: 13, estado: 'RESUELTO' },
  ]);
  mocks.preventives.mockResolvedValue([
    { id: 21, status: 'SCHEDULED' },
    { id: 22, status: 'COMPLETED' },
  ]);
  mocks.resume.mockResolvedValue({ asset: { name: 'Tractor' } });
  mocks.inventory.mockResolvedValue([]);
});

describe('technician offline work package', () => {
  it('downloads every open order with its asset sheet and the usable warehouses', async () => {
    const manifest = await workPackage.downloadWorkPackage();

    expect(mocks.sync).toHaveBeenCalledBefore(mocks.failures);
    expect(mocks.resume.mock.calls.map(([id]) => id).sort()).toEqual([11, 12]);
    expect(manifest.failureIds).toEqual(['11', '12']);
    expect(manifest.preventiveIds).toEqual(['21']);
    expect(manifest.counts).toMatchObject({ failures: 2, preventives: 1 });
    expect(manifest.complete).toBe(true);

    const scopedZones = mocks.inventory.mock.calls
      .filter(([, scoped]) => scoped)
      .map(([groupId]) => groupId);
    expect(scopedZones).toEqual(expect.arrayContaining([null, 4, 7, 9]));

    await expect(workPackage.getWorkPackageStatus()).resolves.toMatchObject({
      failureIds: ['11', '12'],
    });
  });

  it('marks the package incomplete when an order sheet could not be downloaded', async () => {
    mocks.resume.mockImplementation(async (id) => {
      if (id === 12) throw new Error('Timeout');
      return { asset: {} };
    });

    const manifest = await workPackage.downloadWorkPackage();

    expect(manifest.failureIds).toEqual(['11']);
    expect(manifest.complete).toBe(false);
    expect(manifest.errors).toEqual([
      expect.objectContaining({ label: 'Ficha de la orden #12', required: true }),
    ]);
  });

  it('explains that internet is needed when downloading offline', async () => {
    mocks.isNetworkAvailable.mockResolvedValue(false);

    await expect(workPackage.downloadWorkPackage()).rejects.toThrow(/Sin conexión/);
    expect(mocks.failures).not.toHaveBeenCalled();
  });

  it('only downloads automatically when the saved package is older than 15 minutes', () => {
    const now = Date.parse('2026-11-21T12:00:00Z');
    expect(workPackage.isWorkPackageStale(null, now)).toBe(true);
    expect(workPackage.isWorkPackageStale({ downloadedAt: '2026-11-21T11:50:00Z' }, now)).toBe(false);
    expect(workPackage.isWorkPackageStale({ downloadedAt: '2026-11-21T11:40:00Z' }, now)).toBe(true);
  });
});
