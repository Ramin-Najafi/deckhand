<script setup lang="ts">
import { useDeckhandStore } from '../../store/deckhand';
import { Wifi, WifiOff, RefreshCw, ServerCrash } from 'lucide-vue-next';

const store = useDeckhandStore();
</script>

<template>
  <header class="app-header glass-panel">
    <div class="logo">
      <div class="logo-icon"></div>
      <h2>Deckhand</h2>
      <span class="client-id" title="Browser Session ID">#{{ store.clientId }}</span>
    </div>
    
    <div class="navigation-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: store.currentModule === 'dispatch' }" 
        @click="store.currentModule = 'dispatch'"
      >
        Dispatch
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: store.currentModule === 'maintenance' }" 
        @click="store.currentModule = 'maintenance'"
      >
        Maintenance
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: store.currentModule === 'compliance' }" 
        @click="store.currentModule = 'compliance'"
      >
        Compliance
      </button>
    </div>

    <div class="actions">
      <button 
        v-if="!store.isOnline"
        class="btn btn-warning simulate-btn"
        :disabled="store.pendingSyncCount === 0"
        :title="store.pendingSyncCount === 0 ? 'Make an offline change first.' : 'Simulate shore conflict'"
        @click="store.simulateShoreChange"
      >
        <ServerCrash :size="16" />
        Simulate Shore Change (Conflict)
      </button>

      <div class="sync-status" v-if="!store.isOnline && store.pendingSyncCount > 0">
        <span class="pending-badge">{{ store.pendingSyncCount }} pending edits</span>
      </div>

      <div class="sync-status" v-if="store.isOnline && store.isSyncing">
        <RefreshCw class="spin" :size="16" />
        <span>Syncing...</span>
      </div>
      
      <div class="toggle-container" @click="store.toggleOnlineStatus">
        <span class="toggle-label" :class="{ 'active': !store.isOnline }">Offline</span>
        <div class="toggle-switch" :class="{ 'is-on': store.isOnline }">
          <div class="toggle-knob">
            <Wifi v-if="store.isOnline" :size="12" class="knob-icon" />
            <WifiOff v-else :size="12" class="knob-icon" />
          </div>
        </div>
        <span class="toggle-label" :class="{ 'active': store.isOnline }">Online</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 6px;
}

.navigation-tabs {
  display: flex;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.25rem;
  gap: 0.25rem;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.4rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.client-id {
  font-family: monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  margin-left: 0.5rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.pending-badge {
  background: var(--warning);
  color: #fff;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.75rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.simulate-btn {
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.simulate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  animation: none;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  background: var(--bg-surface);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  user-select: none;
}

.toggle-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.2s;
}

.toggle-label.active {
  color: var(--text-main);
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: var(--danger);
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-switch.is-on {
  background: var(--success);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-switch.is-on .toggle-knob {
  transform: translateX(20px);
}

.knob-icon {
  color: #333;
}
</style>
