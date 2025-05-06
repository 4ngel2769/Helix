<template>
  <div class="server-grid">
    <div 
      v-for="server in servers" 
      :key="server.id" 
      :class="['server-card', !server.hasBot ? 'disabled' : '']"
    >
      <img :src="server.icon" :alt="server.name" />
      <h3>{{ server.name }}</h3>
      <button 
        v-if="server.hasBot" 
        class="manage-btn"
      >
        Manage
      </button>
      <button 
        v-else 
        class="add-btn"
      >
        Add Bot
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import type { Server } from '../../types'

export default defineComponent({
  name: 'ServerList',
  props: {
    servers: {
      type: Array as PropType<Server[]>,
      required: true
    }
  }
})
</script>

<style scoped>
.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.server-card {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
}

.server-card img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin-bottom: 0.5rem;
}

.server-card.disabled {
  opacity: 0.7;
}

.manage-btn, .add-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.manage-btn {
  background-color: #42b983;
  color: white;
}

.add-btn {
  background-color: #3498db;
  color: white;
}
</style>