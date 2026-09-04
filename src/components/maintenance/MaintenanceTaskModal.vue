<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeckhandStore } from '../../store/deckhand';
import { CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  taskId: string;
  assetId: string;
}>();

const emit = defineEmits(['close']);
const store = useDeckhandStore();

const task = computed(() => store.maintenanceTasks.find(t => t.id === props.taskId));
const asset = computed(() => store.assets.find(a => a.id === props.assetId));

const runningHours = ref(asset.value?.current_running_hours || 0);

const logCompletion = async () => {
  if (!task.value) return;

  // 1. Update the Task
  await store.updateMaintenanceTask(props.taskId, {
    status: 'Completed',
    last_completed_at: new Date().toISOString(),
    last_completed_running_hours: runningHours.value,
  });

  emit('close');
};
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content glass-panel" v-if="task && asset">
      <h2>Complete Maintenance Task</h2>
      <p class="subtitle">Log completion of <strong>{{ task.title }}</strong> on {{ asset.name }}.</p>
      
      <div class="form-group">
        <label>Current Vessel Running Hours</label>
        <div class="input-wrapper">
          <input 
            type="number" 
            v-model="runningHours" 
            class="input"
            min="0"
          />
          <span class="suffix">hrs</span>
        </div>
        <p class="help-text">This will be recorded against the task history for compliance auditing.</p>
      </div>
      
      <div class="modal-actions">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="logCompletion">
          <CheckCircle2 :size="16" />
          Mark as Completed
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 450px;
  padding: 1.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
}

h2 {
  margin-bottom: 0.5rem;
  color: white;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.subtitle strong {
  color: white;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-main);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input {
  background: var(--bg-main);
  border: 1px solid var(--border);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  width: 150px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.suffix {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.help-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-main);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
}
.btn-primary:hover {
  background: #2563eb;
}
</style>
