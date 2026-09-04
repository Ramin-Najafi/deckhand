<script setup lang="ts">
import { useDeckhandStore } from '../../store/deckhand';
import DraggableJob from './DraggableJob.vue';

const store = useDeckhandStore();

const onDragStart = (e: DragEvent, job: any) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', job.id);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const onDrop = async (e: DragEvent) => {
  const jobId = e.dataTransfer?.getData('text/plain');
  if (jobId) {
    await store.updateJob(jobId, {
      assigned_asset_id: null,
      status: 'Unassigned'
    });
  }
};
</script>

<template>
  <div class="sidebar glass-panel">
    <div class="sidebar-header">
      <h3>Unassigned Jobs</h3>
      <span class="badge">{{ store.unassignedJobs.length }}</span>
    </div>
    
    <div 
      class="jobs-list"
      @dragover.prevent
      @dragenter.prevent
      @drop="onDrop"
    >
      <DraggableJob 
        v-for="job in store.unassignedJobs" 
        :key="job.id" 
        :job="job"
        @job-drag-start="onDragStart"
      />
      
      <div v-if="store.unassignedJobs.length === 0" class="empty-state">
        All jobs assigned!
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: none;
  background: var(--bg-main);
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  font-size: 1rem;
  color: var(--text-main);
}

.badge {
  background: var(--bg-surface);
  color: var(--text-muted);
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
}

.jobs-list {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
  transition: background 0.2s;
}

.jobs-list:hover {
  background: rgba(255, 255, 255, 0.02);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
}
</style>
