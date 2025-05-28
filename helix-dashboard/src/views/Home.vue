<template>
  <div class="home">
    <section class="hero">
      <div class="hero-content">
        <h1>Welcome to Helix Dashboard</h1>
        <p class="hero-subtitle">Manage your Discord server with powerful tools</p>
        <div class="hero-buttons">
          <router-link v-if="isAuthenticated" to="/dashboard" class="btn btn-primary">Go to Dashboard</router-link>
          <router-link v-else to="/login" class="btn btn-primary">Login with Discord</router-link>
        </div>
      </div>
    </section>

    <section class="features">
      <h2>Features</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">🎭</div>
          <h3>Reaction Roles</h3>
          <p>Create interactive role selection menus for your server members</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🛡️</div>
          <p>More features coming soon...</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'Home',
  computed: {
    ...mapGetters(['isAuthenticated'])
  }
};
</script>

<style scoped>
.home {
  padding: 0;
}

.hero {
  padding: 80px 20px;
  background-color: var(--bg-secondary);
  text-align: center;
  margin-bottom: 40px;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.hero-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn {
  padding: 12px 24px;
  font-size: 1.1rem;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.features {
  padding: 40px 20px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

.features h2 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  margin-bottom: 12px;
}

.feature-card p {
  color: var(--text-secondary);
}
</style>