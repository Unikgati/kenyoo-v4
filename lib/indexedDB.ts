import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Driver, Sale, Location, Schedule, Payment, CompanySettings } from '../types';

// Type definitions
type StoreName = keyof typeof STORES;

export interface Syncable {
  synced: boolean;
}

type StoreTypes = {
  products: Product;
  drivers: Driver;
  sales: Sale & Syncable;
  locations: Location;
  schedule: Schedule;
  payments: Payment & Syncable;
  settings: CompanySettings;
};

type PendingAction = {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: StoreName;
  data: StoreTypes[keyof StoreTypes];
  timestamp: number;
  synced: boolean;
};

// Store configurations with properly typed data
const STORES = {
  products: { type: {} as Product, indexes: ['by-name'] },
  drivers: { type: {} as Driver, indexes: ['by-name'] },
  sales: { type: {} as (Sale & Syncable), indexes: ['by-timestamp', 'by-synced'] },
  locations: { type: {} as Location, indexes: ['by-name'] },
  schedule: { type: {} as Schedule, indexes: ['by-date'] },
  payments: { type: {} as (Payment & Syncable), indexes: ['by-timestamp', 'by-synced'] },
  settings: { type: {} as CompanySettings, indexes: [] },
  pendingActions: { type: {} as PendingAction, indexes: ['by-synced'] }
} as const;

// Helper type to get store value type based on store name
type StoreValue<T extends StoreName> = T extends keyof StoreTypes
  ? StoreTypes[T]
  : T extends 'pendingActions'
  ? PendingAction
  : never;

// Database schema
interface OfflineDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-name': string };
  };
  drivers: {
    key: string;
    value: Driver;
    indexes: { 'by-name': string };
  };
  sales: {
    key: string;
    value: Sale & Syncable;
    indexes: { 'by-timestamp': string; 'by-synced': number }; // Using 0/1 for boolean
  };
  locations: {
    key: string;
    value: Location;
    indexes: { 'by-name': string };
  };
  schedule: {
    key: string;
    value: Schedule;
    indexes: { 'by-date': string };
  };
  payments: {
    key: string;
    value: Payment & Syncable;
    indexes: { 'by-timestamp': string; 'by-synced': number }; // Using 0/1 for boolean
  };
  settings: {
    key: string;
    value: CompanySettings;
  };
  pendingActions: {
    key: string;
    value: PendingAction;
    indexes: { 'by-synced': number }; // Using 0/1 for boolean
  };
}

let db: IDBPDatabase<OfflineDB>;
let dbInitPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export const initDB = async () => {
  if (db) return db;
  
  // Gunakan promise yang sama jika sudah ada inisialisasi yang sedang berjalan
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = openDB<OfflineDB>('driver-sales-app', 1, {
    upgrade(db) {
      // Create stores for each table
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-name', 'name');
      }

      if (!db.objectStoreNames.contains('drivers')) {
        const driverStore = db.createObjectStore('drivers', { keyPath: 'id' });
        driverStore.createIndex('by-name', 'name');
      }

      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by-timestamp', 'timestamp');
        salesStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('locations')) {
        const locationStore = db.createObjectStore('locations', { keyPath: 'id' });
        locationStore.createIndex('by-name', 'name');
      }

      if (!db.objectStoreNames.contains('schedule')) {
        const scheduleStore = db.createObjectStore('schedule', { keyPath: 'id' });
        scheduleStore.createIndex('by-date', 'date');
      }

      if (!db.objectStoreNames.contains('payments')) {
        const paymentsStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentsStore.createIndex('by-timestamp', 'timestamp');
        paymentsStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pendingActions')) {
        const pendingStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
        pendingStore.createIndex('by-synced', 'synced');
      }
    },
  });

  try {
    db = await dbInitPromise;
    return db;
  } finally {
    dbInitPromise = null;
  }
};

export const storeData = async <T extends StoreName>(storeName: T, data: StoreValue<T>) => {
  try {
    const db = await initDB();
    await db.put(storeName, data);
  } catch (err) {
    console.error(`Error storing data in ${storeName}:`, err);
    throw new Error(`Failed to store data in ${storeName}: ${err.message}`);
  }
};

export const getData = async <T extends StoreName>(storeName: T, id: string): Promise<StoreValue<T> | undefined> => {
  const db = await initDB();
  return db.get(storeName, id) as Promise<StoreValue<T> | undefined>;
};

export const getAllData = async <T extends StoreName>(storeName: T): Promise<StoreValue<T>[]> => {
  try {
    const db = await initDB();
    
    // Type guard untuk memeriksa apakah store memiliki index tertentu
    const hasTimeStampIndex = (store: T): store is IndexableStore<T, 'by-timestamp'> => {
      return ['sales', 'payments'].includes(store as string);
    };
    
    const hasNameIndex = (store: T): store is IndexableStore<T, 'by-name'> => {
      return ['products', 'drivers', 'locations'].includes(store as string);
    };
    
    // Gunakan index yang sesuai berdasarkan tipe store
    if (hasTimeStampIndex(storeName)) {
      return db.getAllFromIndex(storeName, 'by-timestamp') as Promise<StoreValue<T>[]>;
    }
    
    if (hasNameIndex(storeName)) {
      return db.getAllFromIndex(storeName, 'by-name') as Promise<StoreValue<T>[]>;
    }
    
    return db.getAll(storeName) as Promise<StoreValue<T>[]>;
  } catch (err) {
    console.error(`Error getting all data from ${storeName}:`, err);
    return [];
  }
};

export const deleteData = async <T extends StoreName>(storeName: T, id: string) => {
  const db = await initDB();
  await db.delete(storeName, id);
};

export const addPendingAction = async <T extends StoreName>(action: 'create' | 'update' | 'delete', table: T, data: StoreValue<T>) => {
  const db = await initDB();
  await db.add('pendingActions', {
    id: crypto.randomUUID(),
    action,
    table,
    data,
    timestamp: Date.now(),
    synced: false,
  } as PendingAction);
};

type SyncableStore<T extends StoreName> = T extends keyof OfflineDB 
  ? OfflineDB[T] extends { indexes: { 'by-synced': any } } 
    ? T 
    : never 
  : never;

type IndexableStore<T extends StoreName, I extends string> = T extends keyof OfflineDB 
  ? OfflineDB[T] extends { indexes: { [K in I]: any } } 
    ? T 
    : never 
  : never;

export const getUnsynedActions = async (): Promise<PendingAction[]> => {
  const db = await initDB();
  const typedStore = 'pendingActions' as IndexableStore<'pendingActions', 'by-synced'>;
  const results = await db.getAllFromIndex(
    typedStore, 
    'by-synced', 
    IDBKeyRange.only(0)
  );
  return results as PendingAction[];
};

export const markActionSynced = async (id: string) => {
  const db = await initDB();
  const action = await db.get('pendingActions', id) as PendingAction | undefined;
  if (action) {
    action.synced = true;
    await db.put('pendingActions', action);
  }
};

export const getUnsynedData = async <T extends StoreName>(
  storeName: T
): Promise<Array<StoreValue<T> & Syncable>> => {
  const db = await initDB();
  
  try {
    // Use a raw IDBObjectStore to check for index existence
    const rawStore = (db as unknown as IDBDatabase)
      .transaction(storeName as string)
      .objectStore(storeName as string);
      
    if (rawStore.indexNames.contains('by-synced')) {
      // Safe to use the typed DB since we confirmed index exists
      const typedStore = storeName as IndexableStore<T, 'by-synced'>;
      const results = await (db as IDBPDatabase<OfflineDB>).getAllFromIndex(
        typedStore,
        'by-synced', 
        IDBKeyRange.only(0)
      );
      return results as Array<StoreValue<T> & Syncable>;
    }
  } catch {
    // Ignore any errors and return empty array
  }
  
  return [];
};

export const markDataSynced = async <T extends StoreName>(storeName: T, id: string) => {
  const db = await initDB();
  const item = await db.get(storeName, id) as StoreValue<T>;
  if (item && 'synced' in item) {
    (item as unknown as Syncable).synced = true;
    await db.put(storeName, item);
  }
};

export const getUnsynedSales = async (): Promise<(Sale & Syncable)[]> => {
  const db = await initDB();
  try {
    // Get sales where synced is false OR synced is undefined (for backward compatibility)
    const sales = await db.getAll('sales') as (Sale & Syncable)[];
    return sales.filter(sale => !sale.synced);
  } catch (err) {
    console.error('Error getting unsynced sales:', err);
    return [];
  }
};

export const batchMarkSalesSynced = async (saleIds: string[]) => {
  const db = await initDB();
  const tx = db.transaction('sales', 'readwrite');
  const store = tx.store;

  try {
    await Promise.all(
      saleIds.map(async (id) => {
        const sale = await store.get(id);
        if (sale) {
          sale.synced = true;
          await store.put(sale);
        }
      })
    );
    await tx.done;
  } catch (err) {
    console.error('Error marking sales as synced:', err);
    throw err;
  }
};

export const getAllSalesSorted = async (): Promise<(Sale & Syncable)[]> => {
  const db = await initDB();
  try {
    // Mendapatkan semua sales dari IndexedDB dan mengurutkannya
    const sales = await db.getAllFromIndex('sales', 'by-timestamp') as (Sale & Syncable)[];
    return sales.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  } catch (err) {
    console.error('Error getting all sales:', err);
    return [];
  }
};

export const clearSyncFlags = async () => {
  const db = await initDB();
  try {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.store;
    
    // Get all sales
    const sales = await store.getAll();
    
    // Update each sale's synced flag to false
    await Promise.all(
      sales.map(async (sale) => {
        sale.synced = false;
        await store.put(sale);
      })
    );
    
    await tx.done;
    console.log('All sales sync flags cleared');
  } catch (err) {
    console.error('Error clearing sync flags:', err);
    throw err;
  }
};

export const deleteAllSales = async () => {
  const db = await initDB();
  try {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.store;
    
    // Delete all sales
    await store.clear();
    await tx.done;
    
    console.log('All sales deleted from IndexedDB');
  } catch (err) {
    console.error('Error deleting all sales:', err);
    throw err;
  }
};

export const syncLocalWithServer = async <T extends StoreName>(
  storeName: T,
  serverIds: string[],
  options: {
    preserveUnsynced?: boolean;
    batchSize?: number;
    forceSync?: boolean;
    lastSyncTimestamp?: number;
  } = {}
) => {
  const { 
    preserveUnsynced = true, 
    batchSize = 50, // Reduced batch size for mobile
    forceSync = false,
    lastSyncTimestamp
  } = options;

  // Skip sync if last sync was too recent (5 minutes) unless forced
  if (!forceSync && lastSyncTimestamp && Date.now() - lastSyncTimestamp < 5 * 60 * 1000) {
    console.log(`Skipping sync for ${storeName}, last sync was too recent`);
    return;
  }
  
  const db = await initDB();
  try {
    // Get all local items
    const localItems = await getAllData(storeName);
    
    // Create set of server IDs for faster lookup
    const serverIdSet = new Set(serverIds);
    
    // Find local items that don't exist on server
    const itemsToDelete = localItems.filter(item => {
      // Jika preserveUnsynced true, jangan hapus item yang belum tersinkron
      if (preserveUnsynced && 'synced' in item && !(item as Syncable).synced) {
        return false;
      }
      return !serverIdSet.has(item.id);
    });
    
    if (itemsToDelete.length === 0) {
      return;
    }

    // Process deletions in batches
    for (let i = 0; i < itemsToDelete.length; i += batchSize) {
      const batch = itemsToDelete.slice(i, i + batchSize);
      await bulkDeleteData(storeName, batch.map(item => item.id));
    }
    
    console.log(`Removed ${itemsToDelete.length} local ${storeName} items that don't exist on server`);
  } catch (err) {
    console.error(`Error syncing local ${storeName} with server:`, err);
    throw err;
  }
};

export const bulkStoreData = async <T extends StoreName>(
  storeName: T, 
  items: StoreValue<T>[],
  options: {
    batchSize?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<void> => {
  if (!items.length) return;

  const { batchSize = 50, onProgress } = options;

  try {
    const db = await initDB();
    const totalItems = items.length;
    let processedItems = 0;

    // Process in smaller batches to prevent memory issues
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.store;

      await Promise.all(
        batch.map(item => store.put(item))
      );

      await tx.done;
      
      processedItems += batch.length;
      if (onProgress) {
        onProgress((processedItems / totalItems) * 100);
      }
    }
  } catch (err) {
    console.error(`Error storing bulk data in ${storeName}:`, err);
    throw new Error(`Failed to store bulk data in ${storeName}: ${err.message}`);
  }
};

export const bulkDeleteData = async <T extends StoreName>(
  storeName: T,
  ids: string[]
): Promise<void> => {
  if (!ids.length) return;

  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.store;

    await Promise.all(
      ids.map(id => store.delete(id))
    );

    await tx.done;
  } catch (err) {
    console.error(`Error deleting bulk data from ${storeName}:`, err);
    throw new Error(`Failed to delete bulk data from ${storeName}: ${err.message}`);
  }
};

export const getDataByPage = async <T extends StoreName>(
  storeName: T,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  data: StoreValue<T>[];
  totalItems: number;
  totalPages: number;
}> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.store;

    // Get total count
    const total = await store.count();
    const totalPages = Math.ceil(total / pageSize);

    // Calculate bounds
    const start = (page - 1) * pageSize;
    let cursor = await store.openCursor();
    let items: StoreValue<T>[] = [];
    let counter = 0;

    // Skip to start position
    while (cursor && counter < start) {
      cursor = await cursor.continue();
      counter++;
    }

    // Collect items for current page
    while (cursor && items.length < pageSize) {
      items.push(cursor.value as StoreValue<T>);
      cursor = await cursor.continue();
    }

    return {
      data: items,
      totalItems: total,
      totalPages
    };
  } catch (err) {
    console.error(`Error getting paged data from ${storeName}:`, err);
    return {
      data: [],
      totalItems: 0,
      totalPages: 0
    };
  }
};
