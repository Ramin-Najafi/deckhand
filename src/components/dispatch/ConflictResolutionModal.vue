<script setup lang="ts">
import { computed } from 'vue';
import { useDeckhandStore } from '../../store/deckhand';
import { AlertTriangle } from 'lucide-vue-next';

const store = useDeckhandStore();
const conflict = computed(() => store.pendingConflict);
</script>

<template>
  <div v-if="conflict" class="modal-overlay">
    <div class="modal-content glass-panel">
      <div class="modal-header">
        <AlertTriangle :size="24" class="warning-icon" />
        <h2>Sync Conflict Detected</h2>
      </div>

      <div class="modal-body">
        <p class="subtitle">
          The shore server updated record <strong>{{ conflict.localJob.job_number || conflict.localJob.name || conflict.localJob.id.substring(0, 6) }}</strong> while you were offline. 
          Your local changes are conflicting with the latest remote version. Please choose which version to keep.
        </p>

        <div class="version-grid">
          <!-- Local Version -->
          <div class="version-card local-card">
            <div class="badge badge-local">YOUR DEVICE</div>
            <h3>Local Version</h3>
            <p class="version-sub">Modified offline</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Status</span>
                <span class="value">{{ conflict.localJob.status }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Version</span>
                <span class="value">{{ conflict.localJob.version }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Last Modified</span>
                <span class="value">You</span>
              </div>
            </div>

            <button class="btn btn-primary mt-auto" @click="store.resolveConflict('local')">
              Keep My Version (Overwrite Shore)
            </button>
          </div>

          <!-- Remote Version -->
          <div class="version-card remote-card">
            <div class="badge badge-remote">SHORE SERVER</div>
            <h3>Remote Version</h3>
            <p class="version-sub">Latest from server</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Status</span>
                <span class="value">{{ conflict.remoteJob.status }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Version</span>
                <span class="value">{{ conflict.remoteJob.version }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Last Modified</span>
                <span class="value">{{ conflict.remoteJob.last_modified_by || 'Shore Dispatcher' }}</span>
              </div>
            </div>

            <button class="btn btn-warning mt-auto" @click="store.resolveConflict('remote')">
              Keep Their Version (Discard Mine)
            </button>
          </div>
        </div>
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 650px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1rem 1.5rem;
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.warning-icon {
  color: var(--danger);
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  color: white;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
}

.subtitle {
  color: var(--text-main);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.subtitle strong {
  color: white;
  background: var(--bg-main);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.version-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.version-card {
  border-radius: 6px;
  padding: 1.25rem;
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
}

.local-card {
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.remote-card {
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-bottom-left-radius: 6px;
  color: white;
}

.badge-local {
  background: rgba(99, 102, 241, 0.8);
}

.badge-remote {
  background: rgba(249, 115, 22, 0.8);
}

.version-card h3 {
  margin: 0 0 0.25rem 0;
  color: white;
  font-size: 1.1rem;
}

.version-sub {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 0 0 1rem 0;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.4rem;
  font-size: 0.85rem;
}

.detail-row .label {
  color: var(--text-muted);
}

.detail-row .value {
  color: white;
  font-weight: 500;
}

.btn {
  padding: 0.6rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  color: white;
  width: 100%;
  text-align: center;
  transition: background 0.2s;
}

.btn-primary {
  background: rgba(99, 102, 241, 0.9);
  border-color: rgba(99, 102, 241, 1);
}
.btn-primary:hover {
  background: rgba(99, 102, 241, 1);
}

.btn-warning {
  background: rgba(249, 115, 22, 0.9);
  border-color: rgba(249, 115, 22, 1);
}
.btn-warning:hover {
  background: rgba(249, 115, 22, 1);
}

.mt-auto {
  margin-top: auto;
}
</style>
