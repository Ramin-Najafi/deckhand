<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeckhandStore } from '../../store/deckhand';
import { ShieldAlert, CheckCircle2, X } from 'lucide-vue-next';

const props = defineProps<{
  jobId: string;
  assetId: string;
}>();

const emit = defineEmits(['close', 'assigned']);
const store = useDeckhandStore();

const selectedPersonToAdd = ref<string>('');
const error = ref<string | null>(null);
const success = ref(false);

const vesselCrew = computed(() => {
  return store.persons.filter(p => p.assigned_asset_id === props.assetId && !p.archived_at);
});

const availableCrew = computed(() => {
  return store.persons.filter(p => !p.assigned_asset_id && !p.archived_at);
});

const removeCrew = async (personId: string) => {
  await store.updatePerson(personId, { assigned_asset_id: null });
  error.value = null; // Clear any existing errors
};

const addCrew = async () => {
  if (!selectedPersonToAdd.value) return;
  await store.updatePerson(selectedPersonToAdd.value, { assigned_asset_id: props.assetId });
  selectedPersonToAdd.value = '';
  error.value = null; // Clear any existing errors
};

const checkCertifications = () => {
  const job = store.jobs.find(j => j.id === props.jobId);
  if (!job) return false;
  
  const jobEnd = new Date(job.planned_end);
  
  for (const person of vesselCrew.value) {
    const certs = store.certifications.filter(c => c.person_id === person.id);
    const requiredCerts = certs.filter(c => c.required_to_operate);
    
    for (const cert of requiredCerts) {
      const expires = new Date(cert.expires);
      if (expires < jobEnd) {
        error.value = `Cannot assign job: ${person.name}'s ${cert.cert_type} expires before job completion!`;
        return false;
      }
    }
  }
  
  return true;
};

const assignJob = async () => {
  error.value = null;
  
  if (vesselCrew.value.length === 0) {
    error.value = "Vessel must have at least one crew member assigned.";
    return;
  }
  
  if (checkCertifications()) {
    success.value = true;
    setTimeout(() => {
      emit('assigned');
    }, 1500);
  }
};
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content glass-panel">
      <h2>Vessel Crew & Compliance</h2>
      <p class="subtitle">Manage crew for this vessel. Certifications will be verified before dispatch.</p>
      
      <div v-if="error" class="alert error">
        <ShieldAlert :size="18" class="shrink-0" />
        <span>{{ error }}</span>
      </div>
      
      <div v-if="success" class="alert success">
        <CheckCircle2 :size="18" class="shrink-0" />
        <span>Compliance passed. Job assigned.</span>
      </div>
      
      <div class="crew-section" v-if="!success">
        <div class="crew-list">
          <label>Currently Assigned Crew</label>
          <div v-if="vesselCrew.length === 0" class="empty-crew">No crew assigned to this vessel.</div>
          <div v-for="person in vesselCrew" :key="person.id" class="crew-item">
            <div>
              <span class="font-medium text-white">{{ person.name }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ person.position }}</span>
            </div>
            <button class="remove-btn" @click="removeCrew(person.id)" title="Remove from vessel">
              <X :size="14" />
            </button>
          </div>
        </div>

        <div class="form-group mt-4">
          <label>Add Crew Member</label>
          <div class="flex gap-2">
            <select v-model="selectedPersonToAdd" class="input flex-1">
              <option value="" disabled>Select unassigned crew...</option>
              <option v-for="person in availableCrew" :key="person.id" :value="person.id">
                {{ person.name }} ({{ person.position }})
              </option>
            </select>
            <button class="btn btn-secondary" @click="addCrew" :disabled="!selectedPersonToAdd">Add</button>
          </div>
        </div>
      </div>
      
      <div class="modal-actions" v-if="!success">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="assignJob">Confirm Dispatch</button>
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

.crew-section {
  margin-bottom: 1.5rem;
}

.crew-list {
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem;
}

.crew-list label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

.empty-crew {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.875rem;
}

.crew-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.crew-item:last-child {
  border-bottom: none;
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--danger);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.7;
}
.remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  opacity: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input {
  background: var(--bg-main);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
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
}
.btn:hover {
  background: var(--bg-surface);
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
}
.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: var(--bg-surface);
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.mt-4 { margin-top: 1rem; }
.ml-2 { margin-left: 0.5rem; }
.flex { display: flex; }
.flex-1 { flex: 1; }
.gap-2 { gap: 0.5rem; }
.font-medium { font-weight: 500; }
.text-xs { font-size: 0.75rem; }
.text-gray-400 { color: #9ca3af; }
.text-white { color: white; }
.shrink-0 { flex-shrink: 0; }
</style>
