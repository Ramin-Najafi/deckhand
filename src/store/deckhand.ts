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
  const pendingConflict = ref<{ action: SyncAction, localJob: Job, remoteJob: Job } | null>(null);
  const pendingSyncCount = ref(0);
  const clientId = crypto.randomUUID().substring(0, 6).toUpperCase();
  const currentModule = ref<'dispatch' | 'maintenance' | 'compliance'>('dispatch');
  
  const refreshPendingCount = async () => {
    const actions = await getActions();
    pendingSyncCount.value = actions.length;
  };
  let conflictResolver: ((decision: 'local' | 'remote') => void) | null = null;
  let isInitialized = false;

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
        assets.value = seedAssets;
        jobs.value = seedJobs;
        persons.value = seedPersons;
        certifications.value = seedCertifications;
        locations.value = seedLocations;
        
        await setCache('assets', JSON.parse(JSON.stringify(assets.value)));
        await setCache('jobs', JSON.parse(JSON.stringify(jobs.value)));
        await setCache('persons', JSON.parse(JSON.stringify(persons.value)));
        await setCache('certifications', JSON.parse(JSON.stringify(certifications.value)));
        await setCache('locations', JSON.parse(JSON.stringify(locations.value)));
      }

      // 3. Remote Sync / Reconciliation (if online)
      if (hasSupabase && isOnline.value) {
        const [
          { data: remoteJobs },
          { data: remoteAssets },
          { data: remotePersons },
          { data: remoteCerts },
          { data: remoteLocations },
          { data: remoteMaintenanceTasks },
          { data: remoteAssetCerts },
          { data: remoteDrills }
        ] = await Promise.all([
          supabase.from('jobs').select('*'),
          supabase.from('assets').select('*'),
          supabase.from('persons').select('*'),
          supabase.from('certifications').select('*'),
          supabase.from('locations').select('*'),
          supabase.from('maintenance_tasks').select('*'),
          supabase.from('asset_certifications').select('*'),
          supabase.from('drills').select('*')
        ]);

        const actions = await getActions();
        const pendingJobIds = new Set(actions.filter(a => a.entity_type === 'Job').map(a => a.entity_id));
        const pendingPersonIds = new Set(actions.filter(a => a.entity_type === 'Person').map(a => a.entity_id));
        const pendingTaskIds = new Set(actions.filter(a => a.entity_type === 'MaintenanceTask').map(a => a.entity_id));
        const pendingAssetCertIds = new Set(actions.filter(a => a.entity_type === 'AssetCertification').map(a => a.entity_id));
        const pendingDrillIds = new Set(actions.filter(a => a.entity_type === 'Drill').map(a => a.entity_id));

        console.log(`[Init] Remote Jobs: ${remoteJobs?.length || 0} vs Local IndexedDB Jobs: ${jobs.value.length}`);

        const mergeTable = async (localRef: any, remoteData: any[], pendingIds: Set<string>, tableName: string) => {
          if (!remoteData) return;
          
          const remoteMap = new Map(remoteData.map((item: any) => [item.id, item]));
          const localMap = new Map(localRef.value.map((item: any) => [item.id, item]));
          
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
            // Re-assign taking remote additions/deletions into account
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
      isInitialized = false; // allow retry
    }
  };

  let currentChannel: any = null;
  const setupSubscriptions = () => {
    if (!hasSupabase) return;

    // Remove existing channel if it exists to prevent subscription collision
    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }

    currentChannel = supabase.channel('public:all');
    currentChannel
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
        if (!isOnline.value) return; // Prevent shore changes from leaking into local state while offline

        const table = payload.table;
        const newRecord = payload.new;
        
        // Skip deletes for now in this demo
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
            // Only overwrite if remote version > local version to prevent jitter
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

  const sync = async () => {
    if (!isOnline.value || isSyncing.value) return;
    
    isSyncing.value = true;
    syncError.value = null;
    
    try {
      const actions = await getActions();
      
      for (const action of actions) {
        if (action.action_type === 'UPDATE' && action.entity_type === 'Job') {
          const localJob = jobs.value.find(j => j.id === action.entity_id);
          if (!localJob) {
            await removeAction(action.id);
            continue;
          }

          if (hasSupabase) {
            // Check for conflicts remotely
            const { data: remoteData } = await supabase
              .from('jobs')
              .select('*')
              .eq('id', action.entity_id)
              .single();

            if (remoteData) {
              console.log(`[Sync Debug] JOB ${localJob.id} - Local Version: ${localJob.version}, Remote Version: ${remoteData.version}`);
            }

            if (remoteData && remoteData.version > localJob.version) {
              // Conflict detected! Wait for user resolution via modal
              console.log(`[Sync Debug] CONFLICT DETECTED for JOB ${localJob.id}. Opening modal...`);
              const decision = await promptConflictResolution(action, localJob, remoteData as Job);
              console.log(`[Sync Debug] Conflict resolved. User chose: ${decision}`);
              if (decision === 'remote') {
                // Keep theirs: update local memory and IDB, discard local action
                const idx = jobs.value.findIndex(j => j.id === remoteData.id);
                if (idx > -1) jobs.value[idx] = { ...jobs.value[idx], ...remoteData, _syncStatus: 'synced' };
                await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
                await removeAction(action.id);
                continue;
              }
              // If 'local', we proceed to overwrite remote
            }

            // Proceed with update, bump version
            const nextVersion = (localJob.version || 1) + 1;
            const { error } = await supabase
              .from('jobs')
              .update({ ...action.payload, version: nextVersion })
              .eq('id', action.entity_id);
              
            if (error) {
              console.error('Sync error on Job update:', error);
              // If it's a conflict, FK violation, or bad request, stop looping it
              if (String(error.code).includes('409') || String(error.message).includes('409') || error.code === '23505' || error.code === '23503') {
                localJob._syncStatus = 'conflicted';
                await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
                await removeAction(action.id);
              }
            } else {
              localJob.version = nextVersion;
              localJob._syncStatus = 'synced';
              await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
              await removeAction(action.id);
            }
          } else {
            // Mock Shore Fallback
            localJob.version += 1;
            localJob._syncStatus = 'synced';
            await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
            await removeAction(action.id);
          }
        } else if (action.action_type === 'UPDATE' && action.entity_type === 'Person') {
          const localPerson = persons.value.find(p => p.id === action.entity_id);
          if (!localPerson) {
            await removeAction(action.id);
            continue;
          }

          if (hasSupabase) {
            const nextVersion = (localPerson.version || 1) + 1;
            const { error } = await supabase
              .from('persons')
              .update({ ...action.payload, version: nextVersion })
              .eq('id', action.entity_id);
              
            if (error) {
              console.error('Sync error on Person update:', error);
              if (String(error.code).includes('409') || String(error.message).includes('409')) {
                await removeAction(action.id);
              }
            } else {
              localPerson.version = nextVersion;
              localPerson._syncStatus = 'synced';
              await setCache('persons', JSON.parse(JSON.stringify(toRaw(persons.value))));
              await removeAction(action.id);
            }
          } else {
            localPerson.version += 1;
            localPerson._syncStatus = 'synced';
            await setCache('persons', JSON.parse(JSON.stringify(toRaw(persons.value))));
            await removeAction(action.id);
          }
        } else {
          // Unhandled action type, remove it so it doesn't block the queue
          await removeAction(action.id);
        }
      }

      // If Supabase is connected, pull latest state for ALL tables to ensure we're fresh
      if (hasSupabase) {
        const [
          { data: assetsData },
          { data: jobsData },
          { data: personsData },
          { data: certsData },
          { data: locationsData }
        ] = await Promise.all([
          supabase.from('assets').select('*'),
          supabase.from('jobs').select('*'),
          supabase.from('persons').select('*'),
          supabase.from('certifications').select('*'),
          supabase.from('locations').select('*')
        ]);

        if (assetsData) { assets.value = assetsData; await setCache('assets', JSON.parse(JSON.stringify(toRaw(assets.value)))); }
        if (personsData) { 
          console.log(`Persons fetched from shore: ${personsData.length}`);
          persons.value = personsData; 
          await setCache('persons', JSON.parse(JSON.stringify(toRaw(persons.value)))); 
        }
        if (certsData) { certifications.value = certsData; await setCache('certifications', JSON.parse(JSON.stringify(toRaw(certifications.value)))); }
        if (locationsData) { locations.value = locationsData; await setCache('locations', JSON.parse(JSON.stringify(toRaw(locations.value)))); }

        if (jobsData) {
          jobsData.forEach(remoteJob => {
            const idx = jobs.value.findIndex(j => j.id === remoteJob.id);
            if (idx === -1) jobs.value.push(remoteJob);
            else if (remoteJob.version > jobs.value[idx].version) jobs.value[idx] = remoteJob;
          });
          await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
        }
      }
    } catch (e: any) {
      syncError.value = e.message;
    } finally {
      isSyncing.value = false;
      await refreshPendingCount();
    }
  };

  const promptConflictResolution = (action: SyncAction, localJob: Job, remoteJob: Job): Promise<'local' | 'remote'> => {
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

  const updateJob = async (jobId: string, updates: Partial<Job>) => {
    // 1. ALWAYS optimistic update locally first
    const idx = jobs.value.findIndex(j => j.id === jobId);
    if (idx > -1) {
      jobs.value[idx] = { ...jobs.value[idx], ...updates, _syncStatus: isOnline.value ? 'syncing' : 'local' };
      await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
    }

    // 2. ALWAYS push to local action queue
    const action: SyncAction = {
      id: crypto.randomUUID(),
      client_id: 'browser',
      action_type: 'UPDATE',
      entity_type: 'Job',
      entity_id: jobId,
      payload: updates,
      created_at: new Date().toISOString(),
      processed: false
    };
    await pushAction(action);
    await refreshPendingCount();

    // 3. Trigger sync if online
    if (isOnline.value) {
      sync();
    }
  };

  const updatePerson = async (personId: string, updates: Partial<Person>) => {
    const idx = persons.value.findIndex(p => p.id === personId);
    if (idx > -1) {
      persons.value[idx] = { ...persons.value[idx], ...updates, _syncStatus: isOnline.value ? 'syncing' : 'local' };
      await setCache('persons', JSON.parse(JSON.stringify(toRaw(persons.value))));
    }

    const action: SyncAction = {
      id: crypto.randomUUID(),
      client_id: 'browser',
      action_type: 'UPDATE',
      entity_type: 'Person',
      entity_id: personId,
      payload: updates,
      created_at: new Date().toISOString(),
      processed: false
    };
    await pushAction(action);
    await refreshPendingCount();

    if (isOnline.value) sync();
  };

  const updateDrill = async (drillId: string, updates: Partial<Drill>) => {
    const idx = drills.value.findIndex(d => d.id === drillId);
    if (idx > -1) {
      drills.value[idx] = { ...drills.value[idx], ...updates, _syncStatus: isOnline.value ? 'syncing' : 'local' };
      await setCache('drills', JSON.parse(JSON.stringify(toRaw(drills.value))));
    }

    const action: SyncAction = {
      id: crypto.randomUUID(),
      client_id: 'browser',
      action_type: 'UPDATE',
      entity_type: 'Drill',
      entity_id: drillId,
      payload: updates,
      created_at: new Date().toISOString(),
      processed: false
    };
    await pushAction(action);
    await refreshPendingCount();

    if (isOnline.value) {
      sync();
    }
  };

  const updateMaintenanceTask = async (taskId: string, updates: Partial<MaintenanceTask>) => {
    const idx = maintenanceTasks.value.findIndex(t => t.id === taskId);
    if (idx > -1) {
      maintenanceTasks.value[idx] = { ...maintenanceTasks.value[idx], ...updates, _syncStatus: isOnline.value ? 'syncing' : 'local' };
      await setCache('maintenanceTasks', JSON.parse(JSON.stringify(toRaw(maintenanceTasks.value))));
    }

    const action: SyncAction = {
      id: crypto.randomUUID(),
      client_id: 'browser',
      action_type: 'UPDATE',
      entity_type: 'MaintenanceTask',
      entity_id: taskId,
      payload: updates,
      created_at: new Date().toISOString(),
      processed: false
    };
    await pushAction(action);
    await refreshPendingCount();

    if (isOnline.value) {
      sync();
    }
  };

  const simulateShoreChange = async () => {
    const actions = await getActions();
    const pendingJobUpdate = actions.find(a => a.entity_type === 'Job' && a.action_type === 'UPDATE');
    
    if (!pendingJobUpdate) {
      alert('No pending offline job edits found. Make an offline change first.');
      return;
    }

    const targetJob = jobs.value.find(j => j.id === pendingJobUpdate.entity_id);
    if (!targetJob) return;
    
    console.log(`[Simulate Shore Change Debug] Targeting JOB ${targetJob.id} which has a pending offline update.`);
    
    const nextVersion = targetJob.version + 1;
    // We'll change the assigned_asset_id to force a direct conflict with their edit
    const shoreAssetId = '11111111-1111-1111-1111-100000000002'; // Seaspan Eagle
    
    if (hasSupabase) {
      await supabase
        .from('jobs')
        .update({ assigned_asset_id: shoreAssetId, version: nextVersion, last_modified_by: 'Shore Dispatcher' })
        .eq('id', targetJob.id);
    } else {
      targetJob.assigned_asset_id = shoreAssetId;
      targetJob.version = nextVersion;
      targetJob.last_modified_by = 'Shore Dispatcher';
      await setCache('jobs', JSON.parse(JSON.stringify(toRaw(jobs.value))));
    }
      
    alert('Shore change simulated! The shore has re-assigned this job. Reconnect to see the conflict dialog.');
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
