<template>
  <div class="dashboard">
    <h1>My Servers</h1>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading servers...</p>
    </div>
    
    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button @click="fetchGuilds" class="btn btn-primary">Try Again</button>
    </div>
    
    <div v-else class="server-grid">
      <ServerCard
        v-for="guild in guilds"
        :key="guild.id"
        :guild="guild"
        @manage="navigateToGuild"
        @invite="inviteBot"
      />
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import ServerCard from '@/components/dashboard/ServerCard.vue';

export default {
  name: 'Dashboard',
  components: {
    ServerCard
  },
  computed: {
    ...mapState({
      guilds: state => state.guilds.list,
      loading: state => state.guilds.loading,
      error: state => state.guilds.error
    })
  },
  methods: {
    ...mapActions(['fetchGuilds', 'generateBotInvite']),
    navigateToGuild(guildId) {
      this.$router.push(`/dashboard/${guildId}`);
    },
    async inviteBot(guildId) {
      const inviteUrl = await this.generateBotInvite(guildId);
      window.open(inviteUrl, '_blank');
    }
  },
  created() {
    this.fetchGuilds();
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      // If user is not logged in, redirect to login
      if (!vm.$store.getters.isAuthenticated) {
        vm.$router.replace('/login');
      }
    });
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

h1 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 40px 0;
}

.error-container p {
  margin-bottom: 16px;
  color: var(--error-color);
}
</style>