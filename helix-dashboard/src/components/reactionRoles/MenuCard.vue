<template>
  <div class="menu-card" :class="{ 'inactive': !menu.active }">
    <div class="menu-card-header">
      <div class="menu-title">
        <h3>{{ menu.title }}</h3>
        <span v-if="!menu.active" class="inactive-badge">Paused</span>
      </div>
      <div class="menu-actions">
        <button @click="toggleMenu" class="btn-icon" :title="menu.active ? 'Pause' : 'Resume'">
          <i :class="menu.active ? 'icon-pause' : 'icon-play'"></i>
          {{ menu.active ? '⏸️' : '▶️' }}
        </button>
        <button @click="editMenu" class="btn-icon" title="Edit">
          <i class="icon-edit">✏️</i>
        </button>
        <button @click="deleteMenu" class="btn-icon delete" title="Delete">
          <i class="icon-delete">🗑️</i>
        </button>
      </div>
    </div>
    
    <div class="menu-info">
      <div class="info-group">
        <span class="info-label">Channel:</span>
        <span class="info-value" :class="{ 'error': !menu.channelExists }">
          #{{ menu.channelName || 'Unknown' }}
          <span v-if="!menu.channelExists" class="error-text">(deleted)</span>
        </span>
      </div>
      
      <div class="info-group">
        <span class="info-label">Roles:</span>
        <span class="info-value">{{ menu.roles.length }} role{{ menu.roles.length !== 1 ? 's' : '' }}</span>
      </div>
      
      <div class="info-group">
        <span class="info-label">Max Selections:</span>
        <span class="info-value">{{ menu.maxSelections || 'Unlimited' }}</span>
      </div>
    </div>
    
    <div class="menu-description">
      <p>{{ truncatedDescription }}</p>
    </div>
    
    <div class="menu-roles">
      <div v-for="role in limitedRoles" :key="role.roleId" 
           class="role-tag" :style="{ backgroundColor: role.color + '30', borderColor: role.color }">
        {{ role.name }}
        <span v-if="role.emoji" class="role-emoji">{{ role.emoji }}</span>
        <span v-if="!role.exists" class="missing-indicator">❌</span>
      </div>
      <div v-if="menu.roles.length > 5" class="more-roles">
        +{{ menu.roles.length - 5 }} more
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuCard',
  props: {
    menu: {
      type: Object,
      required: true
    }
  },
  computed: {
    truncatedDescription() {
      if (this.menu.description.length <= 100) return this.menu.description;
      return this.menu.description.substring(0, 97) + '...';
    },
    limitedRoles() {
      return this.menu.roles.slice(0, 5);
    }
  },
  methods: {
    toggleMenu() {
      this.$emit('toggle', this.menu);
    },
    editMenu() {
      this.$emit('edit', this.menu);
    },
    deleteMenu() {
      this.$emit('delete', this.menu);
    }
  }
};
</script>

<style scoped>
.menu-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out;
  border-left: 4px solid var(--accent-color);
}

.menu-card:hover {
  transform: translateY(-2px);
}

.menu-card.inactive {
  border-left-color: var(--text-secondary);
  opacity: 0.7;
}

.menu-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.menu-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-title h3 {
  margin: 0;
  font-size: 1.1rem;
  word-break: break-word;
}

.inactive-badge {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 12px;
  text-transform: uppercase;
  font-weight: bold;
}

.menu-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.1);
}

.btn-icon.delete:hover {
  color: var(--error-color);
}

.menu-info {
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.info-group {
  display: flex;
  margin-bottom: 4px;
}

.info-label {
  color: var(--text-secondary);
  width: 110px;
  flex-shrink: 0;
}

.error {
  color: var(--error-color);
}

.error-text {
  font-size: 0.8rem;
  font-style: italic;
}

.menu-description {
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.menu-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 4px;
}

.role-emoji {
  font-size: 0.9rem;
}

.missing-indicator {
  color: var(--error-color);
  font-size: 0.7rem;
}

.more-roles {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 2px 8px;
}
</style>