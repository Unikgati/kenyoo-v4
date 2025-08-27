import { supabase } from './supabaseClient';
import { 
  initDB, 
  getUnsynedActions, 
  markActionSynced, 
  getUnsynedData, 
  markDataSynced,
  storeData 
} from './indexedDB';

class SyncService {
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private syncInterval: number | null = null;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Initialize sync status
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.startSync();
    }
  }

  private handleOnline = () => {
    console.log('App is online');
    this.isOnline = true;
    this.startSync();
  };

  private handleOffline = () => {
    console.log('App is offline');
    this.isOnline = false;
    this.stopSync();
  };

  private startSync() {
    if (!this.syncInterval) {
      this.syncInterval = window.setInterval(() => this.sync(), 30000); // Sync every 30 seconds
      this.sync(); // Run initial sync
    }
  }

  private stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async sync() {
    if (this.isSyncing || !this.isOnline) return;

    try {
      this.isSyncing = true;
      console.log('Starting sync...');

      // 1. Process pending actions
      const pendingActions = await getUnsynedActions();
      for (const action of pendingActions) {
        try {
          const table = action.table as "products" | "drivers" | "sales" | "locations" | "schedule" | "payments" | "settings";
          switch (action.action) {
            case 'create':
              await supabase.from(table).insert(action.data);
              break;
            case 'update':
              await supabase.from(table).update(action.data).eq('id', action.data.id);
              break;
            case 'delete':
              await supabase.from(table).delete().eq('id', action.data.id);
              break;
          }
          await markActionSynced(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
        }
      }

      // 2. Sync unsynced local data
      const unsyncedTables = ['sales', 'payments'] as const;
      for (const table of unsyncedTables) {
        const unsynedData = await getUnsynedData(table);
        for (const item of unsynedData) {
          try {
            const { error } = await supabase.from(table).upsert(item as any);
            if (!error) {
              await markDataSynced(table, item.id);
            }
          } catch (error) {
            console.error(`Failed to sync ${table} item ${item.id}:`, error);
          }
        }
      }

      // 3. Pull latest data from server
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - 1); // Get data from last hour

      const syncs = [
        { table: 'products' as const, orderBy: 'updated_at' },
        { table: 'drivers' as const, orderBy: 'updated_at' },
        { table: 'locations' as const, orderBy: 'updated_at' },
        { table: 'schedule' as const, orderBy: 'updated_at' },
        { table: 'settings' as const, orderBy: 'updated_at' }
      ];

      for (const { table, orderBy } of syncs) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .gt('updated_at', timestamp.toISOString())
            .order(orderBy, { ascending: false });

          if (!error && data) {
            for (const item of data) {
              await storeData(table, item);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch ${table}:`, error);
        }
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Public method to force a sync
  public async forceSync() {
    await this.sync();
  }
}

export const syncService = new SyncService();
