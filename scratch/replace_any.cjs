const fs = require('fs');
let content = fs.readFileSync('src/store/deckhand.ts', 'utf8');

// 1. Imports
content = content.replace(
  "import type { Asset, Job, Activity, Person, Certification, SyncAction, MaintenanceTask, AssetCertification, Drill, EntityType } from '../types';",
  "import type { Asset, Job, Activity, Person, Certification, SyncAction, MaintenanceTask, AssetCertification, Drill, EntityType, Location, BaseEntity } from '../types';"
);
content = content.replace(
  "import { ref, computed, toRaw } from 'vue';",
  "import { ref, computed, toRaw, type Ref } from 'vue';"
);

// 2. locations ref
content = content.replace(
  "const locations = ref<any[]>([]);",
  "const locations = ref<Location[]>([]);"
);

// 3. pendingConflict
content = content.replace(
  "const pendingConflict = ref<{ action: SyncAction, localJob: any, remoteJob: any } | null>(null);",
  "const pendingConflict = ref<{ action: SyncAction, localJob: BaseEntity, remoteJob: BaseEntity } | null>(null);"
);

// 4. seed data
content = content.replace("seedAssets as any", "seedAssets as Asset[]");
content = content.replace("seedJobs as any", "seedJobs as Job[]");
content = content.replace("seedPersons as any", "seedPersons as Person[]");
content = content.replace("seedCertifications as any", "seedCertifications as Certification[]");
content = content.replace("seedLocations as any", "seedLocations as Location[]");

// 5. mergeTable
content = content.replace(
  "const mergeTable = async (localRef: any, remoteData: any[], pendingIds: Set<string>, tableName: string) => {",
  "const mergeTable = async (localRef: Ref<BaseEntity[]>, remoteData: BaseEntity[], pendingIds: Set<string>, tableName: string) => {"
);
content = content.replace(
  "const remoteMap = new Map<string, any>(remoteData.map((item: any) => [item.id, item]));",
  "const remoteMap = new Map<string, BaseEntity>(remoteData.map((item: BaseEntity) => [item.id, item]));"
);
content = content.replace(
  "const localMap = new Map<string, any>(localRef.value.map((item: any) => [item.id, item]));",
  "const localMap = new Map<string, BaseEntity>(localRef.value.map((item: BaseEntity) => [item.id, item]));"
);

// 6. init catch
content = content.replace(
  "} catch (e: any) {\n      console.error('Error initializing local store', e);",
  "} catch (e: unknown) {\n      console.error('Error initializing local store', e);"
);

// 7. currentChannel
content = content.replace(
  "let currentChannel: any = null;",
  "let currentChannel: ReturnType<typeof supabase.channel> | null = null;"
);

// 8. postgres_changes payload
content = content.replace(
  ".on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {",
  ".on('postgres_changes', { event: '*', schema: 'public' }, async (payload: { table: string, new: Record<string, unknown>, eventType: string }) => {"
);

// 9. findIndex / find across the file (item: any, i: any)
// We have several of these, let's use a regex
content = content.replace(/\(item: any\)/g, "(item: BaseEntity)");
content = content.replace(/\(i: any\)/g, "(i: BaseEntity)");

// 10. payload as any
content = content.replace(
  "originalAction.payload as any",
  "originalAction.payload as Record<string, unknown>"
);

// 11. sync catch
content = content.replace(
  "} catch (e: any) {\n      syncError.value = e.message;\n    }",
  "} catch (err) {\n      const e = err as Error;\n      syncError.value = e.message;\n    }"
);

// 12. promptConflictResolution
content = content.replace(
  "const promptConflictResolution = (action: SyncAction, localJob: any, remoteJob: any): Promise<'local' | 'remote'> => {",
  "const promptConflictResolution = (action: SyncAction, localJob: BaseEntity, remoteJob: BaseEntity): Promise<'local' | 'remote'> => {"
);

// 13. updateEntityGeneric
content = content.replace(
  "const updateEntityGeneric = async (entityType: EntityType, id: string, updates: any) => {",
  "const updateEntityGeneric = async (entityType: EntityType, id: string, updates: Record<string, unknown>) => {"
);

fs.writeFileSync('src/store/deckhand.ts', content);
console.log('done replacing any');
