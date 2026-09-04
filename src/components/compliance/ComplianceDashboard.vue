<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeckhandStore } from '../../store/deckhand';
import { ShieldAlert, ShieldCheck, FileText, Anchor, Calendar, CheckCircle } from 'lucide-vue-next';

const store = useDeckhandStore();

const activeVesselId = ref<string | null>(null);

const vessels = computed(() => {
  return store.assets.filter(a => a.asset_type === 'Tug' || a.asset_type === 'Barge');
});

if (vessels.value.length > 0 && !activeVesselId.value) {
  activeVesselId.value = vessels.value[0].id;
}

const activeVessel = computed(() => {
  return vessels.value.find(v => v.id === activeVesselId.value) || null;
});

const isCertExpiring = (dateStr: string) => {
  const expires = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(expires.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return expires < now || diffDays <= 30; // True if expired or expiring within 30 days
};

const vesselCerts = computed(() => {
  if (!activeVesselId.value) return [];
  const certs = store.assetCertifications.filter(c => c.asset_id === activeVesselId.value);
  return certs.sort((a, b) => new Date(a.expires_date).getTime() - new Date(b.expires_date).getTime());
});

const vesselDrills = computed(() => {
  if (!activeVesselId.value) return [];
  const drills = store.drills.filter(d => d.asset_id === activeVesselId.value);
  return drills.sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    return new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime();
  });
});

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString();
};

const completeDrill = async (drillId: string) => {
  await store.updateDrill(drillId, {
    status: 'Completed',
    completed_date: new Date().toISOString()
  });
};
</script>

<template>
  <div class="compliance-dashboard">
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
          <!-- Warning if any cert is expiring or drill is overdue -->
          <ShieldAlert 
            v-if="store.assetCertifications.some(c => c.asset_id === vessel.id && isCertExpiring(c.expires_date)) || 
                  store.drills.some(d => d.asset_id === vessel.id && d.status === 'Scheduled' && new Date(d.scheduled_date || 0) < new Date())"
            :size="16" class="text-orange-500" 
          />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content" v-if="activeVessel">
      <div class="content-header">
        <div class="header-titles">
          <h2>{{ activeVessel.name }} Compliance</h2>
          <p class="subtitle">Track vessel certifications and safety drills</p>
        </div>
      </div>

      <div class="compliance-grid">
        <!-- Certifications Column -->
        <div class="compliance-column">
          <div class="column-header">
            <FileText :size="20" class="text-blue-400" />
            <h3>Vessel Certifications</h3>
          </div>
          
          <div class="card-list">
            <div 
              v-for="cert in vesselCerts" 
              :key="cert.id"
              class="cert-card"
              :class="{ 'border-orange-500 bg-orange-500/10': isCertExpiring(cert.expires_date) }"
            >
              <div class="cert-header">
                <h4>{{ cert.cert_type }}</h4>
                <ShieldAlert v-if="isCertExpiring(cert.expires_date)" :size="16" class="text-orange-500" title="Expiring soon or expired" />
                <ShieldCheck v-else :size="16" class="text-green-500" title="Valid" />
              </div>
              <div class="cert-dates">
                <div class="date-col">
                  <span class="label">Issued</span>
                  <span class="value">{{ formatDate(cert.issued_date) }}</span>
                </div>
                <div class="date-col">
                  <span class="label">Expires</span>
                  <span class="value" :class="{ 'text-orange-400 font-bold': isCertExpiring(cert.expires_date) }">
                    {{ formatDate(cert.expires_date) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="vesselCerts.length === 0" class="empty-state">
              <p>No certifications recorded.</p>
            </div>
          </div>
        </div>

        <!-- Drills Column -->
        <div class="compliance-column">
          <div class="column-header">
            <Anchor :size="20" class="text-blue-400" />
            <h3>Safety Drills</h3>
          </div>
          
          <div class="card-list">
            <div 
              v-for="drill in vesselDrills" 
              :key="drill.id"
              class="drill-card"
              :class="{ 'opacity-60': drill.status === 'Completed' }"
            >
              <div class="drill-header">
                <h4>{{ drill.drill_type }}</h4>
                <span class="badge" :class="drill.status === 'Completed' ? 'badge-green' : 'badge-blue'">
                  {{ drill.status }}
                </span>
              </div>
              <div class="drill-meta">
                <div class="meta-item" v-if="drill.scheduled_date && drill.status !== 'Completed'">
                  <Calendar :size="14" />
                  <span :class="{'text-red-400': new Date(drill.scheduled_date) < new Date()}">
                    Scheduled: {{ formatDate(drill.scheduled_date) }}
                  </span>
                </div>
                <div class="meta-item" v-if="drill.completed_date">
                  <CheckCircle :size="14" class="text-green-400" />
                  <span>Completed: {{ formatDate(drill.completed_date) }}</span>
                </div>
              </div>
              
              <button 
                v-if="drill.status !== 'Completed'"
                class="btn btn-secondary btn-sm mt-3"
                @click="completeDrill(drill.id)"
              >
                Log as Completed
              </button>
            </div>
            
            <div v-if="vesselDrills.length === 0" class="empty-state">
              <p>No safety drills scheduled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compliance-dashboard {
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
  margin-bottom: 2rem;
}

.header-titles h2 {
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.95rem;
}

.compliance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.compliance-column {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--border);
}

.column-header h3 {
  margin: 0;
  color: white;
  font-size: 1.1rem;
}

.card-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cert-card, .drill-card {
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  transition: transform 0.2s;
}

.cert-card:hover, .drill-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.cert-header, .drill-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.cert-header h4, .drill-header h4 {
  margin: 0;
  color: white;
  font-size: 1rem;
}

.cert-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: 4px;
}

.date-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-col .label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.date-col .value {
  font-size: 0.9rem;
  color: white;
}

.drill-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-main);
  font-size: 0.85rem;
}

.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  white-space: nowrap;
}

.badge-blue { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.badge-green { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }

.btn {
  padding: 0.4rem 1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  width: 100%;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.text-blue-400 { color: #60a5fa; }
.text-green-400 { color: #4ade80; }
.text-green-500 { color: #22c55e; }
.text-orange-400 { color: #fb923c; }
.text-orange-500 { color: #f97316; }
.text-red-400 { color: #f87171; }
.font-bold { font-weight: 600; }
.opacity-60 { opacity: 0.6; }
.mt-3 { margin-top: 0.75rem; }

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.9rem;
}

.border-orange-500 { border-color: rgba(249, 115, 22, 0.5); }
.bg-orange-500\/10 { background-color: rgba(249, 115, 22, 0.1); }
</style>
