<template>
  <div class="server-card" :class="{ 'no-bot': !guild.botPresent }">
    <div class="server-icon">
      <img v-if="guild.iconURL" :src="guild.iconURL" :alt="`${guild.name} icon`" />
      <div v-else class="default-icon">{{ firstLetter }}</div>
    </div>
    
    <div class="server-info">
      <h3>{{ guild.name }}</h3>
    </div>
    
    <div class="server-actions">
      <button 
        v-if="guild.botPresent && guild.canManage" 
        @click="$emit('manage', guild.id)" 
        class="btn btn-primary"
      >
        Manage
      </button>
      
      <button 
        v-else-if="!guild.botPresent" 
        @click="$emit('invite', guild.id)" 
        class="btn btn-outline"
      >
        Add Bot
      </button>
      
      <div v-else class="no-permission">
        Missing permissions
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServerCard',
  props: {
    guild: {
      type: Object,
      required: true
    }
  },
  computed: {
    firstLetter() {
      return this.guild.name.charAt(0).toUpperCase();
    }
  }
};
</script>

<style scoped>
.server-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.server-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.server-card.no-bot {
  opacity: 0.7;
}

.server-icon {
  width: 100%;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-tertiary);
  padding: 16px;
}

.server-icon img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.default-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--accent-color);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  font-weight: bold;
}

.server-info {
  padding: 16px;
  flex: 1;
}

h3 {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-actions {
  padding: 0 16px 16px;
}

.btn {
  width: 100%;
  padding: 8px;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-outline {
  background-color: transparent;
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
}

.btn-outline:hover {
  background-color: rgba(88, 101, 242, 0.1);
}

.no-permission {
  text-align: center;
  padding: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>