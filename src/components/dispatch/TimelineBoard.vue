<script setup lang="ts">
import { useDeckhandStore } from '../../store/deckhand';
import DraggableJob from './DraggableJob.vue';
import CrewAssignmentModal from '../crew/CrewAssignmentModal.vue';
import { computed, ref } from 'vue';

const store = useDeckhandStore();

const assignJobId = ref<string | null>(null);
const assignAssetId = ref<string | null>(null);

// Date and Now line
const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
});

const nowOffset = computed(() => {
  const now = new Date();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  // If it's before 06:00 or after 19:00, hide or clamp
  if (hour < 6) return 0;
  if (hour > 19) return 100;
  return ((hour - 6) / 13) * 100;
});

// Generate hours for the timeline (e.g., 06:00 to 18:00 for demo)
const hours = Array.from({ length: 13 }, (_, i) => i + 6);

const onDrop = async (e: DragEvent, assetId: string, hour: number) => {
  const jobId = e.dataTransfer?.getData('text/plain');
  if (jobId) {
    const today = new Date().toISOString().split('T')[0];
    const plannedStart = `${today}T${hour.toString().padStart(2, '0')}:00:00Z`;
    const plannedEnd = `${today}T${(hour + 3).toString().padStart(2, '0')}:00:00Z`; // Assume 3 hour job
    
    // Set the planned times but keep it unassigned until crew is selected
    await store.updateJob(jobId, {
      planned_start: plannedStart,
      planned_end: plannedEnd
    });
    
    // Open the crew assignment modal
    assignJobId.value = jobId;
    assignAssetId.value = assetId;
  }
};

const onDropDragStart = (e: DragEvent, job: any) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', job.id);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const handleCrewAssigned = async () => {
  if (assignJobId.value && assignAssetId.value) {
    await store.updateJob(assignJobId.value, {
      assigned_asset_id: assignAssetId.value,
      status: 'Assigned'
    });
  }
  closeModal();
};

const handleUnassign = async (job: any) => {
  await store.updateJob(job.id, {
    assigned_asset_id: null,
    status: 'Unassigned'
  });
};

const closeModal = () => {
  assignJobId.value = null;
  assignAssetId.value = null;
};

const getJobsForAsset = (assetId: string) => {
  return store.jobs.filter(j => j.assigned_asset_id === assetId && j.status !== 'Unassigned');
};

const getJobStyle = (job: any) => {
  if (!job.planned_start || !job.planned_end) return {};
  const start = new Date(job.planned_start);
  const end = new Date(job.planned_end);
  const startHour = start.getUTCHours() + start.getUTCMinutes() / 60;
  const endHour = end.getUTCHours() + end.getUTCMinutes() / 60;
  
  // Timeline starts at 06:00
  const offset = startHour - 6;
  const duration = endHour - startHour;
  
  // Each hour column is exactly 1 part of the grid. 
  // We can use percentage-based positioning based on the total 13 hours
  return {
    position: 'absolute',
    left: `${(offset / 13) * 100}%`,
    width: `${(duration / 13) * 100}%`,
    height: '100%'
  };
};

const getCrewCount = (assetId: string) => {
  return store.persons.filter(p => p.assigned_asset_id === assetId && !p.archived_at).length;
};

const tugs = computed(() => store.assets.filter(a => a.asset_type !== 'Barge'));
</script>

<template>
  <div class="timeline-board">
    <div class="date-header">
      <h2>{{ todayFormatted }}</h2>
    </div>

    <div class="timeline-header">
      <div class="header-cell asset-col">Vessel Name</div>
      <div class="header-cell status-col">Status</div>
      <div class="header-cell port-col">Home Port</div>
      <div class="header-cell crew-col">Crew</div>
      <div class="header-cell time-col" v-for="hour in hours" :key="hour">
        {{ hour.toString().padStart(2, '0') }}:00
      </div>
    </div>
    
    <div class="timeline-body">
      <div class="asset-row" v-for="asset in tugs" :key="asset.id">
        <div class="asset-info glass-panel">
          <div class="info-cell asset-col">
            <span class="asset-name">{{ asset.name }}</span>
            <span class="asset-type">{{ asset.asset_type }}</span>
          </div>
          <div class="info-cell status-col text-success">Active</div>
          <div class="info-cell port-col text-muted">Vancouver</div>
          <div class="info-cell crew-col">{{ getCrewCount(asset.id) }}</div>
        </div>
        
        <div class="timeline-grid">
          <div class="now-line" :style="{ left: nowOffset + '%' }"></div>

          <!-- Drop zones -->
          <div 
            class="time-slot" 
            v-for="hour in hours" 
            :key="hour"
            @dragover.prevent
            @dragenter.prevent
            @drop="onDrop($event, asset.id, hour)"
          ></div>
          
          <!-- Placed Jobs -->
          <div class="placed-jobs-container">
            <DraggableJob 
              v-for="job in getJobsForAsset(asset.id)" 
              :key="job.id" 
              :job="job"
              class="placed-job"
              :style="getJobStyle(job)"
              @job-drag-start="onDropDragStart"
              @unassign="handleUnassign"
            />
          </div>
        </div>
      </div>
    </div>
    
    <CrewAssignmentModal 
      v-if="assignJobId && assignAssetId"
      :job-id="assignJobId"
      :asset-id="assignAssetId"
      @close="closeModal"
      @assigned="handleCrewAssigned"
    />
  </div>
</template>

<style scoped>
.timeline-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: var(--bg-main);
  padding: 0.5rem;
  font-size: 0.75rem;
}

.date-header {
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
}

.date-header h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.timeline-header {
  display: flex;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.header-cell {
  padding: 0.25rem 0.5rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
}

.asset-col { width: 140px; flex-shrink: 0; }
.status-col { width: 70px; flex-shrink: 0; }
.port-col { width: 90px; flex-shrink: 0; }
.crew-col { width: 50px; flex-shrink: 0; text-align: center; justify-content: center; }

.time-col {
  flex: 1;
  min-width: 60px;
  text-align: center;
  justify-content: center;
  border-left: 1px solid var(--border);
}

.asset-row {
  display: flex;
  border-bottom: 1px solid var(--border);
  height: 36px; /* Dense rows */
}

.asset-info {
  display: flex;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
}

.info-cell {
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  border-right: 1px solid var(--border);
}
.info-cell:last-child { border-right: none; }

.asset-col {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.asset-name { font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.asset-type { font-size: 0.65rem; color: var(--text-muted); }

.text-success { color: var(--success); }
.text-muted { color: var(--text-muted); }

.timeline-grid {
  flex: 1;
  display: flex;
  position: relative;
  background: var(--bg-main);
  overflow: hidden;
}

.now-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--danger);
  z-index: 10;
  pointer-events: none;
}

.now-line::before {
  content: '';
  position: absolute;
  top: 0;
  left: -3px;
  width: 8px;
  height: 8px;
  background-color: var(--danger);
  border-radius: 50%;
}

.time-slot {
  flex: 1;
  min-width: 60px;
  border-left: 1px dashed rgba(255, 255, 255, 0.05);
  transition: background 0.1s;
}
.time-slot:first-child { border-left: none; }

.time-slot.drag-over, .time-slot:hover {
  background: rgba(59, 130, 246, 0.1);
  cursor: copy;
}

.placed-jobs-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.placed-job {
  pointer-events: auto;
  margin: 0;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: 3px solid var(--primary);
  border-right: 1px solid var(--border);
  box-sizing: border-box;
}
</style>
