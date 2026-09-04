export type AssetType = 'Tug' | 'Barge';
export type Position = 'Captain' | 'Mate' | 'Deckhand' | 'Engineer';
export type JobStatus = 'Unassigned' | 'Assigned' | 'In Progress' | 'Completed';
export type ActivityType = 'RunningFrom' | 'Tow' | 'RunningTo' | 'Downtime';
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'conflicted';

export interface BaseEntity {
  id: string;
  version: number;
  last_modified_by: string | null;
  updated_at: string;
  _syncStatus?: SyncStatus;
}

export interface Asset extends BaseEntity {
  name: string;
  short_name: string | null;
  asset_type: AssetType;
  time_zone: string;
  current_running_hours: number;
  archived_at: string | null;
}

export interface Location extends BaseEntity {
  name: string;
  short_name: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Person extends BaseEntity {
  name: string;
  position: Position;
  assigned_asset_id: string | null;
  archived_at: string | null;
}

export interface Certification extends BaseEntity {
  person_id: string;
  cert_type: string;
  obtained: string; // ISO date string
  expires: string; // ISO date string
  required_to_operate: boolean;
}

export interface Job extends BaseEntity {
  job_number: string;
  customer_id: string | null;
  assigned_asset_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  planned_start: string; // ISO datetime string
  planned_end: string; // ISO datetime string
  status: JobStatus;
  archived_at: string | null;
}

export interface Activity extends BaseEntity {
  job_id: string;
  asset_id: string | null;
  activity_type: ActivityType;
  from_location_id: string | null;
  to_location_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  recorded_by_person_id: string | null;
}

export type TaskStatus = 'Pending' | 'Completed' | 'Overdue';
export type DrillStatus = 'Scheduled' | 'Completed';

export interface MaintenanceTask extends BaseEntity {
  asset_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_running_hours: number | null;
  status: TaskStatus;
  last_completed_at: string | null;
  last_completed_running_hours: number | null;
  archived_at: string | null;
}

export interface AssetCertification extends BaseEntity {
  asset_id: string;
  cert_type: string;
  issued_date: string;
  expires_date: string;
  archived_at: string | null;
}

export interface Drill extends BaseEntity {
  asset_id: string;
  drill_type: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: DrillStatus;
  archived_at: string | null;
}

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'Asset' | 'Location' | 'Person' | 'Certification' | 'Job' | 'Activity' | 'MaintenanceTask' | 'AssetCertification' | 'Drill';

export interface SyncAction {
  id: string;
  client_id: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string;
  payload: any;
  created_at: string;
  processed: boolean;
}
