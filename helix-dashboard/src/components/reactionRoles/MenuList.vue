<template>
  <div class="menu-list">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading reaction roles menus...</p>
    </div>
    
    <div v-else-if="error" class="error-container">
      <div class="error-icon">❌</div>
      <p class="error-message">{{ error }}</p>
      <button @click="fetchMenus" class="btn btn-primary">Try Again</button>
    </div>
    
    <div v-else-if="menus.length === 0" class="empty-container">
      <div class="empty-icon">🎭</div>
      <h3>No Reaction Roles Menus</h3>
      <p>You haven't created any role selection menus yet.</p>
      <button @click="$emit('create')" class="btn btn-primary">Create Your First Menu</button>
    </div>
    
    <div v-else class="menu-grid">
      <div 
        v-for="menu in menus" 
        :key="menu.messageId"
        class="menu-card"
        :class="{ 'menu-inactive': !menu.active }"
      >
        <div class="menu-header">
          <h3 class="menu-title">{{ menu.title }}</h3>
          <div class="menu-badges">
            <span v-if="!menu.active" class="menu-badge inactive">Inactive</span>
            <span v-if="!menu.channelExists" class="menu-badge warning">Channel Missing</span>
          </div>
        </div>
        
        <div class="menu-info">
          <div class="info-row">
            <span class="info-label">Channel:</span>
            <span 
              class="info-value" 
              :class="{ 'text-danger': !menu.channelExists }"
            >
              #{{ menu.channelName }}
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Roles:</span>
            <span class="info-value">{{ menu.roles.length }} role(s)</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Max selections:</span>
            <span class="info-value">{{ menu.maxSelections || 'Unlimited' }}</span>
          </div>
          
          <div v-if="hasInvalidRoles(menu)" class="warning-message">
            <span class="warning-icon">⚠️</span>
            <span>Some roles are missing or invalid</span>
          </div>
        </div>
        
        <div class="menu-description">{{ truncateText(menu.description, 100) }}</div>
        
        <div class="menu-roles">
          <div 
            v-for="role in limitRoles(menu.roles, 5)" 
            :key="role.roleId"
            class="role-tag"
            :style="getRoleStyle(role)"
          >
            <span v-if="role.emoji" class="role-emoji">{{ role.emoji }}</span>
            <span class="role-name">{{ role.name }}</span>
            <span v-if="!role.exists" class="role-warning">⚠️</span>
          </div>
          
          <div v-if="menu.roles.length > 5" class="more-roles">
            +{{ menu.roles.length - 5 }} more
          </div>
        </div>
        
        <div class="menu-actions">
          <button @click="$emit('edit', menu)" class="btn btn-outline btn-sm">
            <span class="action-icon">✏️</span> Edit
          </button>
          <button 
            @click="$emit('toggle', menu)" 
            class="btn btn-outline btn-sm"
            :class="menu.active ? 'btn-pause' : 'btn-resume'"
          >
            <span class="action-icon">{{ menu.active ? '⏸️' : '▶️' }}</span>
            {{ menu.active ? 'Pause' : 'Resume' }}
          </button>
          <button @click="$emit('delete', menu)" class="btn btn-danger btn-sm">
            <span class="action-icon">🗑️</span> Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuList',
  props: {
    guildId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      menus: [],
      loading: true,
      error: null
    };
  },
  methods: {
    async fetchMenus() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await fetch(`/api/guilds/${this.guildId}/reactionroles`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch reaction roles menus');
        }
        
        this.menus = await response.json();
      } catch (error) {
        console.error('Error fetching reaction roles menus:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    truncateText(text, maxLength) {
      return text.length > maxLength 
        ? `${text.substring(0, maxLength)}...` 
        : text;
    },
    
    limitRoles(roles, max) {
      return roles.slice(0, max);
    },
    
    getRoleStyle(role) {
      return {
        backgroundColor: role.color ? `${role.color}20` : '#99AAB520',
        borderColor: role.color || '#99AAB5'
      };
    },
    
    hasInvalidRoles(menu) {
      return menu.roles.some(role => !role.exists);
    }
  },
  mounted() {
    this.fetchMenus();
  }
};
</script>

<style scoped>
.menu-list {
  width: 100%;
}

.loading-container, .error-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-message {
  color: var(--error-color);
  margin-bottom: 1rem;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.menu-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  border-left: 4px solid var(--accent-color);
  transition: transform 0.2s, box-shadow 0.2s;
}

.menu-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.menu-inactive {
  border-left-color: var(--text-secondary);
  opacity: 0.7;
}

.menu-header {
  padding: 1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.menu-title {
  margin: 0;
  font-size: 1.1rem;
  word-break: break-word;
}

.menu-badges {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.menu-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: bold;
}

.menu-badge.inactive {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.menu-badge.warning {
  background-color: rgba(255, 208, 0, 0.2);
  color: #FFD000;
}

.menu-info {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.25rem;
  align-items: center;
}

.info-label {
  width: 40%;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-value {
  flex-grow: 1;
}

.text-danger {
  color: var(--error-color);
}

.warning-message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(255, 208, 0, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.warning-icon {
  font-size: 1rem;
}

.menu-description {
  padding: 0 1rem 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.menu-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 1rem 0.75rem;
}

.role-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 4px;
}

.role-emoji {
  font-size: 1rem;
}

.role-warning {
  color: var(--warning-color);
  margin-left: 2px;
}

.more-roles {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.menu-actions {
  padding: 0.75rem 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid var(--bg-tertiary);
}

.btn {
  cursor: pointer;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.btn-outline:hover {
  background-color: rgba(88, 101, 242, 0.1);
}

.btn-danger {
  background-color: transparent;
  border: 1px solid var(--error-color);
  color: var(--error-color);
}

.btn-danger:hover {
  background-color: rgba(237, 66, 69, 0.1);
}

.btn-pause {
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.btn-resume {
  border-color: var(--success-color);
  color: var(--success-color);
}

.action-icon {
  font-size: 1rem;
}
</style>