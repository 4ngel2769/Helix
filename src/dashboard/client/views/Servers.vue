<template>
  <div class="servers">
    <h1>Your Servers</h1>
    <div v-if="loading">Loading servers...</div>
    <div v-else-if="error">{{ error }}</div>
    <ServerList v-else :servers="servers" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import ServerList from '../components/ServerList.vue'
import type { Server } from '../../types'

export default defineComponent({
  name: 'ServersView',
  components: {
    ServerList
  },
  setup() {
    const servers = ref<Server[]>([])
    const loading = ref(true)
    const error = ref('')

    onMounted(async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch servers')
        }
        const data = await response.json()
        servers.value = (data as { guilds: Server[] }).guilds || []
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'An error occurred'
      } finally {
        loading.value = false
      }
    })

    return {
      servers,
      loading,
      error
    }
  }
})
</script>

<style scoped>
.servers {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>