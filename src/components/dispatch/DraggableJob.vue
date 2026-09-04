<script setup lang="ts">
import type { Job } from '../../types';
import { GripVertical, Clock, MapPin, X } from 'lucide-vue-next';
import { format, parseISO } from 'date-fns';

const props = defineProps<{
  job: Job;
}>();

const formatTime = (isoString: string) => {
  try {
    return format(parseISO(isoString), 'HH:mm');
  } catch (e) {
    return isoString;
  }
};
</script>

<template>
  <div 
    class="job-card"
    draggable="true"
    @dragstart="$emit('job-drag-start', $event, job)"
    :class="'status-' + job.status.replace(' ', '-').toLowerCase()"
  >
    <div class="drag-handle">
      <GripVertical :size="12" />
    </div>
    
    <div class="job-content">
      <div class="job-header">
        <span class="job-number">{{ job.job_number }}</span>
        <span class="customer">{{ job.customer_id || 'Helm Corp' }}</span>
        <span 
          v-if="job._syncStatus" 
          class="sync-badge"
          :class="'sync-' + job._syncStatus"
        ></span>
        <button 
          v-if="job.status !== 'Unassigned'"
          class="unassign-btn" 
          @click.stop="$emit('unassign', job)"
          title="Unassign Job"
        >
          <X :size="12" />
        </button>
      </div>
      
      <div class="job-details">
        <div class="detail-row route">
          <MapPin :size="10" />
          <span>{{ job.from_location_id ? 'YVR' : 'Base' }} &rarr; {{ job.to_location_id ? 'YYJ' : 'Port' }}</span>
        </div>
        <div class="detail-row time">
          <Clock :size="10" />
          <span>{{ formatTime(job.planned_start) }}-{{ formatTime(job.planned_end) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-card {
  display: flex;
  padding: 0;
  cursor: grab;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--primary);
  user-select: none;
  font-size: 0.7rem;
  overflow: hidden;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.job-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
  border-color: rgba(255,255,255,0.2);
}

/* Status Colors */
.status-unassigned { border-left-color: var(--text-muted); }
.status-assigned { border-left-color: var(--primary); }
.status-in-progress { border-left-color: var(--success); background: rgba(16, 185, 129, 0.1); }
.status-completed { border-left-color: var(--text-muted); opacity: 0.7; }
.status-blocked { border-left-color: var(--danger); background: rgba(239, 68, 68, 0.1); }

.job-card:active {
  cursor: grabbing;
}

.drag-handle {
  display: flex;
  align-items: center;
  padding: 0 0.15rem;
  color: var(--text-muted);
  background: rgba(255,255,255,0.05);
  border-right: 1px solid var(--border);
  transition: background 0.2s;
}

.job-card:hover .drag-handle {
  background: rgba(255,255,255,0.1);
  color: white;
}

.job-content {
  padding: 0.25rem 0.4rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.job-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.job-number {
  font-weight: 700;
}

.customer {
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sync-badge {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-local { background: var(--warning); }
.sync-syncing { background: var(--primary); animation: pulse 1s infinite; }
.sync-synced { background: var(--success); }
.sync-conflicted { background: var(--danger); }

.job-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.15rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  color: #ccc;
}

.route {
  font-weight: 500;
}

.unassign-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.1rem;
  margin-left: 0.2rem;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unassign-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
