import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import type { Asset, Job, Activity, Person, Certification, SyncAction, MaintenanceTask, AssetCertification, Drill } from '../types';
import { supabase, hasSupabase } from '../lib/supabase';
import { pushAction, getActions, removeAction, setCache, getCache } from '../lib/idb';
import { seedAssets, seedJobs, seedPersons, seedCertifications, seedLocations } from '../lib/seed';

export const useDeckhandStore = defineStore('deckhand', () => {
  const isOnline = ref(true);
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);

  // State
  const assets = ref<Asset[]>([]);
  const jobs = ref<Job[]>([]);
  const activities = ref<Activity[]>([]);
  const persons = ref<Person[]>([]);
  const certifications = ref<Certification[]>([]);
  const locations = ref<any[]>([]);
  
  // New modules
  const maintenanceTasks = ref<MaintenanceTask[]>([]);
  const assetCertifications = ref<AssetCertification[]>([]);
  const drills = ref<Drill[]>([]);

  // Conflict Resolution State
  const pendingConflict = ref<{ action: SyncAction, localJob: any, remoteJob: any } | null>(null);
  const pendingSyncCount = ref(0);
  const clientId = crypto.randomUUID().substring(0, 6).toUpperCase();
  const currentModule = ref<'dispatch' | 'maintenance' | 'compliance'>('dispatch');
  
  const refreshPendingCount = async () => {
    const actions = await getActions();
    pendingSyncCount.value = actions.length;
  };
  let conflictResolver: ((decision: 'local' | 'remote') => void) | null = null;
  let isInitialized = false;

  const getApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

  const fetchTable = async (table: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/data/${table}`);
      if (!response.ok) throw new Error('API fetch failed');
      return await response.json();
    } catch (err) {
      console.warn(`[Fallback] .NET API unreachable for ${table}, falling back to Supabase REST`);
      if (hasSupabase) {
        const { data } = await supabase.from(table).select('*');
        return data || [];
      }
      return null; // Fallback failed or no Supabase
    }
  };

  const init = async () => {
    if (isInitialized) return;
    isInitialized = true;
    
    try {
      // 1. ALWAYS load from IDB first (Local-First)
      assets.value = (await getCache('assets')) || [];
      jobs.value = (await getCache('jobs')) || [];
      activities.value = (await getCache('activities')) || [];
      persons.value = (await getCache('persons')) || [];
      certifications.value = (await getCache('certifications')) || [];
      locations.value = (await getCache('locations')) || [];
      maintenanceTasks.value = (await getCache('maintenanceTasks')) || [];
      assetCertifications.value = (await getCache('assetCertifications')) || [];
      drills.value = (await getCache('drills')) || [];

      // 2. If IDB is completely empty, seed it locally
      if (jobs.value.length === 0 && assets.value.length === 0) {
        console.log('IDB empty, seeding from local fixtures...');
        assets.value = seedAssets as any;
        jobs.value = seedJobs as any;
        persons.value = seedPersons as any;
        certifications.value = seedCertifications as any;
        locations.value = seedLocations as any;
        
        await setCache('assets', JSON.parse(JSON.stringify(assets.value)));
        await setCache('jobs', JSON.parse(JSON.stringify(jobs.value)));
        await setCache('persons', JSON.parse(JSON.stringify(persons.value)));
        await setCache('certifications', JSON.parse(JSON.stringify(certifications.value)));
        await setCache('locations', JSON.parse(JSON.stringify(locations.value)));
      }

      // 3. Remote Sync / Reconciliation (if online)
      if (hasSupabase && isOnline.value) {
        const [
          remoteJobs,
          remoteAssets,
          remotePersons,
          remoteCerts,
          remoteLocations,
          remoteMaintenanceTasks,
          remoteAssetCerts,
          remoteDrills
        ] = await Promise.all([
          fetchTable('jobs'),
          fetchTable('assets'),
          fetchTable('persons'),
          fetchTable('certifications'),
          fetchTable('locations'),
          fetchTable('maintenance_tasks'),
          fetchTable('asset_certifications'),
          fetchTable('drills')
        ]);

        const actions = await getActions();
        const pendingJobIds = new Set(actions.filter(a => a.entity_type === 'Job').map(a => a.entity_id));
        const pendingPersonIds = new Set(actions.filter(a => a.entity_type === 'Person').map(a => a.entity_id));
        const pendingTaskIds = new Set(actions.filter(a => a.entity_type === 'MaintenanceTask').map(a => a.entity_id));
        const pendingAssetCertIds = new Set(actions.filter(a => a.entity_type === 'AssetCertification').map(a => a.entity_id));
        const pendingDrillIds = new Set(actions.filter(a => a.entity_type === 'Drill').map(a => a.entity_id));

        const mergeTable = async (localRef: any, remoteData: any[], pendingIds: Set<string>, tableName: string) => {
          if (!remoteData) return;
          
          const remoteMap = new Map<string, any>(remoteData.map((item: any) => [item.id, item]));
          const localMap = new Map<string, any>(localRef.value.map((item: any) => [item.id, item]));
          
          let changed = false;
          
          // 1. Delete local records that no longer exist remotely (and aren't pending a local edit)
          for (const localId of localMap.keys()) {
            if (!remoteMap.has(localId) && !pendingIds.has(localId)) {
              localMap.delete(localId);
              changed = true;
            }
          }
          
          // 2. Update/Insert from remote
          for (const remoteItem of remoteData) {
            if (pendingIds.has(remoteItem.id)) continue; // Keep local offline edit
            
            const localItem = localMap.get(remoteItem.id);
            if (!localItem || remoteItem.version > localItem.version || localItem._syncStatus !== 'synced') {
              localMap.set(remoteItem.id, { ...remoteItem, _syncStatus: 'synced' });
              changed = true;
            }
          }
          
          if (changed || localRef.value.length !== localMap.size) {
            localRef.value = Array.from(localMap.values());
            await setCache(tableName, JSON.parse(JSON.stringify(toRaw(localRef.value))));
          }
        };

        await mergeTable(jobs, remoteJobs || [], pendingJobIds, 'jobs');
        await mergeTable(assets, remoteAssets || [], new Set(), 'assets');
        await mergeTable(persons, remotePersons || [], pendingPersonIds, 'persons');
        await mergeTable(certifications, remoteCerts || [], new Set(), 'certifications');
        await mergeTable(locations, remoteLocations || [], new Set(), 'locations');
        await mergeTable(maintenanceTasks, remoteMaintenanceTasks || [], pendingTaskIds, 'maintenanceTasks');
        await mergeTable(assetCertifications, remoteAssetCerts || [], pendingAssetCertIds, 'assetCertifications');
        await mergeTable(drills, remoteDrills || [], pendingDrillIds, 'drills');
      }

      // 4. Start sync queue and subscriptions if possible
      if (isOnline.value) {
        sync();
        setupSubscriptions();
      }
      
      await refreshPendingCount();
    } catch (e: any) {
      console.error('Error initializing local store', e);
      isInitialized = false;
    }
  };

  let currentChannel: any = null;
  const setupSubscriptions = () => {
    if (!hasSupabase) return;

    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }

    currentChannel = supabase.channel('public:all');
    currentChannel
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
        if (!isOnline.value) return; 

        const table = payload.table;
        const newRecord = payload.new;
        
        if (payload.eventType === 'DELETE') return;

        let targetRef = null;
        if (table === 'jobs') targetRef = jobs;
        else if (table === 'assets') targetRef = assets;
        else if (table === 'persons') targetRef = persons;
        else if (table === 'certifications') targetRef = certifications;
        else if (table === 'locations') targetRef = locations;

        if (targetRef) {
          const idx = targetRef.value.findIndex((item: any) => item.id === newRecord.id);
          if (idx > -1) {
            if (newRecord.version > targetRef.value[idx].version) {
              targetRef.value[idx] = { ...targetRef.value[idx], ...newRecord, _syncStatus: 'synced' };
            }
          } else {
            targetRef.value.push({ ...newRecord, _syncStatus: 'synced' });
          }
          await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
        }
      })
      .subscribe();
  };

  const getTargetTable = (entityType: string) => {
    switch (entityType) {
      case 'Job': return 'jobs';
      case 'Person': return 'persons';
      case 'MaintenanceTask': return 'maintenance_tasks';
      case 'AssetCertification': return 'asset_certifications';
      case 'Drill': return 'drills';
      default: return '';
    }
  };

  const getTargetRef = (entityType: string) => {
    switch (entityType) {
      case 'Job': return jobs;
      case 'Person': return persons;
      case 'MaintenanceTask': return maintenanceTasks;
      case 'AssetCertification': return assetCertifications;
      case 'Drill': return drills;
      default: return null;
    }
  };

  const processFallbackSync = async (actions: SyncAction[]) => {
    // Original fallback logic hitting Supabase directly
    for (const action of actions) {
      if (action.action_type !== 'UPDATE') {
        await removeAction(action.id);
        continue;
      }

      const table = getTargetTable(action.entity_type);
      const targetRef = getTargetRef(action.entity_type);
      if (!table || !targetRef) {
        await removeAction(action.id);
        continue;
      }

      const localRecord = targetRef.value.find((i: any) => i.id === action.entity_id);
      if (!localRecord) {
        await removeAction(action.id);
        continue;
      }

      const { data: remoteData } = await supabase.from(table).select('*').eq('id', action.entity_id).single();
      if (remoteData && remoteData.version > localRecord.version) {
        const decision = await promptConflictResolution(action, localRecord, remoteData);
        if (decision === 'remote') {
          const idx = targetRef.value.findIndex((i: any) => i.id === remoteData.id);
          if (idx > -1) targetRef.value[idx] = { ...targetRef.value[idx], ...remoteData, _syncStatus: 'synced' };
          await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
          await removeAction(action.id);
          continue;
        }
      }

      const nextVersion = (localRecord.version || 1) + 1;
      const { error } = await supabase.from(table).update({ ...action.payload, version: nextVersion }).eq('id', action.entity_id);
      
      if (error && (String(error.code).includes('409') || error.code === '23505')) {
        localRecord._syncStatus = 'conflicted';
        await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
      } else if (!error) {
        localRecord.version = nextVersion;
        localRecord._syncStatus = 'synced';
        await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
      }
      await removeAction(action.id);
    }
  };

  const sync = async () => {
    if (!isOnline.value || isSyncing.value) return;
    
    isSyncing.value = true;
    syncError.value = null;
    
    try {
      const actions = await getActions();
      if (actions.length === 0) return;

      // 1. Map IDB actions to .NET DTO format
      const syncBatch = actions.map(a => {
        const targetRef = getTargetRef(a.entity_type);
        const currentLocal = targetRef?.value.find((i: any) => i.id === a.entity_id);
        const clientVersion = currentLocal ? currentLocal.version : 1;
        
        return {
          id: a.id,
          table: getTargetTable(a.entity_type),
          payload: JSON.stringify(a.payload),
          clientVersion: clientVersion
        };
      }).filter(a => a.table !== '');

      if (syncBatch.length === 0) return;

      // 2. Send Batch to API
      let apiSuccess = false;
      try {
        const response = await fetch(`${getApiBaseUrl()}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncBatch)
        });

        if (response.ok) {
          apiSuccess = true;
          const { results } = await response.json();
          
          for (const res of results) {
            const originalAction = actions.find(a => a.id === res.actionId);
            if (!originalAction) continue;

            const targetRef = getTargetRef(originalAction.entity_type);
            const table = getTargetTable(originalAction.entity_type);
            if (!targetRef) continue;
            
            const localRecord = targetRef.value.find((i: any) => i.id === originalAction.entity_id);
            if (!localRecord) continue;

            if (res.status === 'applied') {
              localRecord.version = res.newVersion;
              localRecord._syncStatus = 'synced';
              await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
              await removeAction(res.actionId);
            } else if (res.status === 'conflict') {
              // Wait for user to resolve
              const decision = await promptConflictResolution(originalAction, res.clientState, res.serverState);
              if (decision === 'remote') {
                const idx = targetRef.value.findIndex((i: any) => i.id === res.serverState.id);
                if (idx > -1) targetRef.value[idx] = { ...targetRef.value[idx], ...res.serverState, _syncStatus: 'synced' };
                await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
                await removeAction(res.actionId);
              } else {
                // Keep local - requeue it for the next sync with the bumped version
                // We fake an update in memory to trigger a new action
                localRecord.version = res.serverState.version; 
                await updateEntityGeneric(originalAction.entity_type, originalAction.entity_id, originalAction.payload as any);
                await removeAction(res.actionId);
              }
            } else {
              // Error not found or other
              await removeAction(res.actionId);
            }
          }
        } else {
          console.warn('[Sync] .NET API returned an error:', await response.text());
        }
      } catch (err) {
        console.warn('[Sync] .NET API unreachable, falling back to Supabase REST...', err);
      }

      if (!apiSuccess && hasSupabase) {
        await processFallbackSync(actions);
      }

    } catch (e: any) {
      syncError.value = e.message;
    } finally {
      isSyncing.value = false;
      await refreshPendingCount();
    }
  };

  const promptConflictResolution = (action: SyncAction, localJob: any, remoteJob: any): Promise<'local' | 'remote'> => {
    return new Promise((resolve) => {
      pendingConflict.value = { action, localJob, remoteJob };
      conflictResolver = resolve;
    });
  };

  const resolveConflict = (decision: 'local' | 'remote') => {
    if (conflictResolver) {
      conflictResolver(decision);
    }
    pendingConflict.value = null;
    conflictResolver = null;
  };

  const toggleOnlineStatus = () => {
    isOnline.value = !isOnline.value;
    if (isOnline.value) {
      sync();
    }
  };

  const updateEntityGeneric = async (entityType: string, id: string, updates: any) => {
    const targetRef = getTargetRef(entityType);
    const table = getTargetTable(entityType);
    if (!targetRef || !table) return;

    const idx = targetRef.value.findIndex((i: any) => i.id === id);
    if (idx > -1) {
      targetRef.value[idx] = { ...targetRef.value[idx], ...updates, _syncStatus: isOnline.value ? 'syncing' : 'local' };
      await setCache(table, JSON.parse(JSON.stringify(toRaw(targetRef.value))));
    }

    const action: SyncAction = {
      id: crypto.randomUUID(),
      client_id: clientId,
      action_type: 'UPDATE',
      entity_type: entityType,
      entity_id: id,
      payload: updates,
      created_at: new Date().toISOString(),
      processed: false
    };
    await pushAction(action);
    await refreshPendingCount();

    if (isOnline.value) sync();
  };

  const updateJob = (id: string, u: Partial<Job>) => updateEntityGeneric('Job', id, u);
  const updatePerson = (id: string, u: Partial<Person>) => updateEntityGeneric('Person', id, u);
  const updateDrill = (id: string, u: Partial<Drill>) => updateEntityGeneric('Drill', id, u);
  const updateMaintenanceTask = (id: string, u: Partial<MaintenanceTask>) => updateEntityGeneric('MaintenanceTask', id, u);

  const simulateShoreChange = async () => {
    // Only kept for testing, will just use fallback logic if needed.
    const actions = await getActions();
    const pendingJobUpdate = actions.find(a => a.entity_type === 'Job' && a.action_type === 'UPDATE');
    if (!pendingJobUpdate) { alert('No pending offline job edits found.'); return; }
    const targetJob = jobs.value.find(j => j.id === pendingJobUpdate.entity_id);
    if (!targetJob) return;
    const nextVersion = targetJob.version + 1;
    const shoreAssetId = '11111111-1111-1111-1111-100000000002'; // Seaspan Eagle
    if (hasSupabase) {
      await supabase.from('jobs').update({ assigned_asset_id: shoreAssetId, version: nextVersion, last_modified_by: 'Shore Dispatcher' }).eq('id', targetJob.id);
    }
    alert('Shore change simulated!');
  };

  const unassignedJobs = computed(() => jobs.value.filter(j => j.status === 'Unassigned' || !j.assigned_asset_id));
  
  return {
    isOnline,
    isSyncing,
    syncError,
    assets,
    jobs,
    activities,
    persons,
    certifications,
    locations,
    maintenanceTasks,
    assetCertifications,
    drills,
    unassignedJobs,
    pendingConflict,
    pendingSyncCount,
    clientId,
    currentModule,
    init,
    sync,
    toggleOnlineStatus,
    updateJob,
    updatePerson,
    updateMaintenanceTask,
    updateDrill,
    simulateShoreChange,
    resolveConflict
  };
});
