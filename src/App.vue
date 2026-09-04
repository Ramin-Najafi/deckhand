<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDeckhandStore } from './store/deckhand';
import AppHeader from './components/layout/AppHeader.vue';
import JobSidebar from './components/dispatch/JobSidebar.vue';
import TimelineBoard from './components/dispatch/TimelineBoard.vue';
import ConflictResolutionModal from './components/dispatch/ConflictResolutionModal.vue';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard.vue';
import ComplianceDashboard from './components/compliance/ComplianceDashboard.vue';
import { Info, X } from 'lucide-vue-next';

const store = useDeckhandStore();
const showBanner = ref(false);

const dismissBanner = () => {
  showBanner.value = false;
  sessionStorage.setItem('deckhand_banner_dismissed', 'true');
};

onMounted(async () => {
  if (!sessionStorage.getItem('deckhand_banner_dismissed')) {
    showBanner.value = true;
  }
  await store.init();
});
</script>

<template>
  <div class="app-container">
    <AppHeader />
    
    <div v-if="showBanner" class="onboarding-banner">
      <Info :size="18" class="text-blue-400 shrink-0 mt-0.5" />
      
      <!-- Dispatch Flow -->
      <div v-if="store.currentModule === 'dispatch'" class="banner-content">
        <strong>Dispatch Walkthrough:</strong>
        <ol class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <li>1. Drag a job from the sidebar onto a vessel</li>
          <li>2. Assign crew — try someone with an expiring certificate</li>
          <li>3. Toggle Offline</li>
          <li>4. Move the job to another vessel</li>
          <li>5. Click Simulate Shore Change</li>
          <li>6. Toggle Online to resolve the conflict</li>
        </ol>
      </div>

      <!-- Maintenance Flow -->
      <div v-if="store.currentModule === 'maintenance'" class="banner-content">
        <strong>Maintenance Walkthrough:</strong>
        <ol class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <li>1. View overdue tasks flagged in red</li>
          <li>2. Toggle Offline</li>
          <li>3. Mark a task as completed & log running hours</li>
          <li>4. Toggle Online to sync completion to shore</li>
        </ol>
      </div>

      <!-- Compliance Flow -->
      <div v-if="store.currentModule === 'compliance'" class="banner-content">
        <strong>Compliance Walkthrough:</strong>
        <ol class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <li>1. View expiring certs and scheduled drills</li>
          <li>2. Toggle Offline</li>
          <li>3. Log a drill as completed</li>
          <li>4. Toggle Online to sync compliance data</li>
        </ol>
      </div>

      <button @click="dismissBanner" class="dismiss-btn">
        <X :size="16" />
      </button>
    </div>
    
    <main class="main-content" v-if="store.currentModule === 'dispatch'">
      <JobSidebar />
      <TimelineBoard />
    </main>
    
    <main class="main-content" v-if="store.currentModule === 'maintenance'">
      <MaintenanceDashboard />
    </main>

    <main class="main-content" v-if="store.currentModule === 'compliance'">
      <ComplianceDashboard />
    </main>

    <ConflictResolutionModal />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.onboarding-banner {
  background: rgba(59, 130, 246, 0.15);
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  color: var(--text-main);
  font-size: 0.875rem;
}

.banner-content {
  flex: 1;
}

.banner-content ol {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #bfdbfe;
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: #93c5fd;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
}

.dismiss-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  color: white;
}

/* Utility classes used in banner */
.text-blue-400 { color: #60a5fa; }
.shrink-0 { flex-shrink: 0; }
.mt-0\.5 { margin-top: 0.125rem; }
.mt-1 { margin-top: 0.25rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-x-4 { column-gap: 1rem; }
.gap-y-1 { row-gap: 0.25rem; }
</style>
