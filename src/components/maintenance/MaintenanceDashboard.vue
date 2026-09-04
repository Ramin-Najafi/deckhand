<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeckhandStore } from '../../store/deckhand';
import { Clock, AlertTriangle, CheckCircle, Wrench, Calendar } from 'lucide-vue-next';
import MaintenanceTaskModal from './MaintenanceTaskModal.vue';

const store = useDeckhandStore();

const activeVesselId = ref<string | null>(null);
const selectedTaskId = ref<string | null>(null);

const vessels = computed(() => {
  return store.assets.filter(a => a.asset_type === 'Tug' || a.asset_type === 'Barge');
});

// Select the first vessel by default
if (vessels.value.length > 0 && !activeVesselId.value) {
  activeVesselId.value = vessels.value[0].id;
}

const activeVessel = computed(() => {
  return vessels.value.find(v => v.id === activeVesselId.value) || null;
});

const isTaskOverdue = (task: any, asset: any) => {
  if (task.status === 'Completed') return false;
  if (task.due_date && new Date(task.due_date) < new Date()) return true;
  if (task.due_running_hours && asset.current_running_hours >= task.due_running_hours) return true;
  return task.status === 'Overdue';
};

const vesselTasks = computed(() => {
  if (!activeVesselId.value) return [];
  const tasks = store.maintenanceTasks.filter(t => t.asset_id === activeVesselId.value);
  
  // Sort: Overdue first, then pending, then completed
  return tasks.sort((a, b) => {
    const aOverdue = isTaskOverdue(a, activeVessel.value);
    const bOverdue = isTaskOverdue(b, activeVessel.value);
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return 0;
  });
});

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString();
};

const openTaskModal = (taskId: string) => {
  selectedTaskId.value = taskId;
};

const closeTaskModal = () => {
  selectedTaskId.value = null;
};
</script>

<template>
  <div class="maintenance-dashboard">
    <!-- Vessel Sidebar -->
    <div class="vessel-sidebar glass-panel">
      <div class="sidebar-header">
        <h3>Fleet Assets</h3>
      </div>
      <div class="vessel-list">
        <button 
          v-for="vessel in vessels" 
          :key="vessel.id"
          class="vessel-item"
          :class="{ active: activeVesselId === vessel.id }"
          @click="activeVesselId = vessel.id"
        >
          <div class="vessel-info">
            <span class="vessel-name">{{ vessel.name }}</span>
            <span class="vessel-type">{{ vessel.asset_type }}</span>
          </div>
          <!-- Show an alert icon if this vessel has overdue tasks -->
          <AlertTriangle v-if="store.maintenanceTasks.some(t => t.asset_id === vessel.id && isTaskOverdue(t, vessel))" 
                         :size="16" class="text-red-500" />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content" v-if="activeVessel">
      <div class="content-header">
        <div class="header-titles">
          <h2>{{ activeVessel.name }}</h2>
          <div class="vessel-metrics">
            <div class="metric">
              <Clock :size="16" class="text-blue-400" />
              <span>Running Hours: <strong>{{ activeVessel.current_running_hours?.toLocaleString() || 0 }} hrs</strong></span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" disabled>
          + Add Task
        </button>
      </div>

      <div class="tasks-grid">
        <div 
          v-for="task in vesselTasks" 
          :key="task.id"
          class="task-card"
          :class="[
            task.status === 'Completed' ? 'status-completed' : '',
            isTaskOverdue(task, activeVessel) ? 'status-overdue' : (task.status === 'Pending' ? 'status-pending' : '')
          ]"
        >
          <div class="task-header">
            <h4>{{ task.title }}</h4>
            <span class="badge" :class="isTaskOverdue(task, activeVessel) ? 'badge-red' : (task.status === 'Completed' ? 'badge-green' : 'badge-blue')">
              {{ task.status === 'Completed' ? 'Completed' : (isTaskOverdue(task, activeVessel) ? 'Overdue' : 'Pending') }}
            </span>
          </div>
          <p class="task-desc">{{ task.description }}</p>
          
          <div class="task-meta">
            <div class="meta-item" v-if="task.due_date">
              <Calendar :size="14" />
              <span>Due: {{ formatDate(task.due_date) }}</span>
            </div>
            <div class="meta-item" v-if="task.due_running_hours">
              <Clock :size="14" />
              <span>Due at: {{ task.due_running_hours.toLocaleString() }} hrs</span>
            </div>
          </div>

          <div class="task-actions" v-if="task.status !== 'Completed'">
            <button class="btn btn-secondary btn-sm" @click="openTaskModal(task.id)">
              <CheckCircle :size="14" /> Log Completion
            </button>
          </div>
          <div class="task-completed-info" v-else>
            <span class="text-xs text-gray-400">
              Completed on {{ formatDate(task.last_completed_at) }} 
              <template v-if="task.last_completed_running_hours">
                at {{ task.last_completed_running_hours.toLocaleString() }} hrs
              </template>
            </span>
          </div>
        </div>
        
        <div v-if="vesselTasks.length === 0" class="empty-state">
          <Wrench :size="48" class="text-gray-600 mb-4" />
          <p>No maintenance tasks found for this asset.</p>
        </div>
      </div>
    </div>

    <!-- Log Completion Modal -->
    <MaintenanceTaskModal 
      v-if="selectedTaskId && activeVesselId"
      :task-id="selectedTaskId"
      :asset-id="activeVesselId"
      @close="closeTaskModal"
    />
  </div>
</template>

<style scoped>
.maintenance-dashboard {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--bg-main);
}

.vessel-sidebar {
  width: 280px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
}

.sidebar-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h3 {
  margin: 0;
  color: white;
  font-size: 1rem;
}

.vessel-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.vessel-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.vessel-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.vessel-item.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.vessel-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vessel-name {
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
}

.vessel-type {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 2rem;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-titles h2 {
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.vessel-metrics {
  display: flex;
  gap: 1.5rem;
}

.metric {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.metric strong {
  color: white;
  font-weight: 600;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.task-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.status-overdue {
  border-color: rgba(239, 68, 68, 0.5);
  background: linear-gradient(to bottom, rgba(239, 68, 68, 0.05), var(--bg-surface));
}

.status-completed {
  opacity: 0.7;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.task-header h4 {
  margin: 0;
  color: white;
  font-size: 1.05rem;
  line-height: 1.4;
}

.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  white-space: nowrap;
}

.badge-red { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
.badge-blue { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.badge-green { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }

.task-desc {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
  flex: 1;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #d1d5db;
  font-size: 0.8rem;
  font-weight: 500;
}

.task-actions {
  margin-top: auto;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  width: 100%;
  justify-content: center;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.text-red-500 { color: #ef4444; }
.text-blue-400 { color: #60a5fa; }
.text-xs { font-size: 0.75rem; }
.text-gray-400 { color: #9ca3af; }
.mb-4 { margin-bottom: 1rem; }

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
