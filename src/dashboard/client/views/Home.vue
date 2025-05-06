<template>
  <div class="home">
    <h1>Helix Dashboard</h1>
    <p>Welcome to the Helix Discord Bot Dashboard</p>
    <router-link to="/servers" class="btn">Manage Servers</router-link>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HomeView'
})
</script>

<style scoped>
.home {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.btn {
  display: inline-block;
  background-color: #42b983;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 1rem;
}

.btn:hover {
  background-color: #3aa876;
}
</style>