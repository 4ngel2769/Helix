<template>
  <div class="server-management">
    <div v-if="loading" class="loading">
      <Loader size="large" message="Loading server information..." />
    </div>
    
    <div v-else-if="error" class="error-container">
      <ErrorBoundary :error="error" @retry="loadGuild" />
    </div>
    
    <div v-else class="server-content">
      <div class="server-header">
        <div class="server-info">
          <div class="server-icon">
            <img v-if="guild.icon" :src="guild.icon" :alt="`${guild.name} icon`" />
            <div v-else class="default-icon">{{ guild.name.charAt(0) }}</div>
          </div>
          
          <div class="server-details">
            <h1>{{ guild.name }}</h1>
            <div class="server-stats">
              <div class="stat">
                <span class="stat-value">{{ guild.memberCount }}</span>
                <span class="stat-label">Members</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ guild.settings?.modules ? Object.keys(guild.settings.modules).filter(m => guild.settings.modules[m]).length : 0 }}</span>
                <span class="stat-label">Modules</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modules-grid">
        <div 
          v-for="(module, key) in availableModules" 
          :key="key"
          class="module-card"
          :class="{ disabled: !isModuleEnabled(key) }"
          @click="navigateToModule(key)"
        >
          <div class="module-icon">{{ module.emoji }}</div>
          <h3>{{ module.name }}</h3>
          <p>{{ module.description }}</p>
          <div class="module-status">
            <span class="status-indicator" :class="{ active: isModuleEnabled(key) }"></span>
            {{ isModuleEnabled(key) ? 'Enabled' : 'Disabled' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import Loader from '../components/common/Loader';
import ErrorBoundary from '../components/common/ErrorBoundary';

export default {
  name: 'ServerManagement',
  components: {
    Loader,
    ErrorBoundary
  },
  props: {
    guildId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      guild: {},
      loading: true,
      error: null,
      availableModules: {
        reactionRoles: {
          name: 'Reaction Roles',
          emoji: '🎭',
          description: 'Create and manage role selection menus',
          route: 'reactionroles'
        },
        moderation: {
          name: 'Moderation',
          emoji: '🛡️',
          description: 'Manage server moderation settings',
          route: 'moderation'
        },
        administration: {
          name: 'Administration',
          emoji: '⚙️',
          description: 'Manage bot and server administration',
          route: 'administration'
        },
        verification: {
          name: 'Verification',
          emoji: '✅',
          description: 'Configure member verification',
          route: 'verification'
        }
      }
    };
  },
  methods: {
    ...mapActions(['fetchGuildDetails']),
    
    async loadGuild() {
      try {
        this.loading = true;
        this.error = null;
        this.guild = await this.fetchGuildDetails(this.guildId);
      } catch (error) {
        console.error('Error loading guild details:', error);
        this.error = error.message || 'Failed to load server details';
      } finally {
        this.loading = false;
      }
    },
    
    isModuleEnabled(moduleName) {
      return this.guild?.settings?.modules?.[moduleName] !== false;
    },
    
    navigateToModule(moduleName) {
      if (!this.isModuleEnabled(moduleName)) {
        // Show toast notification
        this.$root.$emit('show-toast', {
          type: 'warning',
          message: `${this.availableModules[moduleName].name} module is disabled`
        });
        return;
      }
      
      const moduleRoute = this.availableModules[moduleName].route;
      this.$router.push(`/dashboard/${this.guildId}/${moduleRoute}`);
    }
  },
  created() {
    this.loadGuild();
  }
};
</script>

<style scoped>
.server-management {
  padding: 20px;
}

.server-header {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.server-info {
  display: flex;
  align-items: center;
  gap: 24px;
}

.server-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--accent-color);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.server-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-icon {
  font-size: 32px;
  font-weight: bold;
  color: white;
}

.server-details h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.server-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-weight: bold;
  font-size: 18px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.module-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-left: 4px solid var(--accent-color);
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.module-card.disabled {
  opacity: 0.6;
  border-left-color: var(--text-secondary);
}

.module-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.module-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.module-card p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  flex: 1;
}

.module-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--text-secondary);
}

.status-indicator.active {
  background-color: var(--success-color);
}

.error-container {
  padding: 24px;
  text-align: center;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>