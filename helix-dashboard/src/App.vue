<template>
  <div id="app">
    <header>
      <nav class="navbar">
        <div class="navbar-brand">
          <router-link to="/">
            <img src="./assets/img/logo.svg" alt="Helix" class="logo" />
            <span class="logo-text">Helix</span>
          </router-link>
        </div>
        <div class="navbar-menu">
          <router-link to="/" class="navbar-item">Home</router-link>
          <router-link to="/dashboard" class="navbar-item" v-if="isAuthenticated">Dashboard</router-link>
          <a v-if="isAuthenticated" @click="logout" class="navbar-item">Logout</a>
          <router-link v-else to="/login" class="navbar-item login-button">Login</router-link>
        </div>
      </nav>
    </header>

    <main>
      <router-view />
    </main>

    <footer class="footer">
      <p>&copy; {{ currentYear }} Helix - A multipurpose Discord bot</p>
    </footer>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'App',
  computed: {
    ...mapGetters(['isAuthenticated']),
    currentYear() {
      return new Date().getFullYear();
    }
  },
  methods: {
    ...mapActions(['logout'])
  },
  created() {
    // Check auth status on app load
    this.$store.dispatch('checkAuth');
  }
};
</script>

<style>
:root {
  --bg-primary: #36393f;
  --bg-secondary: #2f3136;
  --bg-tertiary: #202225;
  --text-primary: #dcddde;
  --text-secondary: #b9bbbe;
  --accent-color: #5865f2;
  --accent-hover: #4752c4;
  --error-color: #ed4245;
  --success-color: #57f287;
  --warning-color: #fee75c;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--bg-tertiary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.navbar-brand a {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text-primary);
}

.logo {
  height: 32px;
  margin-right: 0.5rem;
}

.logo-text {
  font-weight: bold;
  font-size: 1.5rem;
}

.navbar-menu {
  display: flex;
  gap: 1rem;
}

.navbar-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.navbar-item:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.05);
}

.login-button {
  background-color: var(--accent-color);
  color: white;
}

.login-button:hover {
  background-color: var(--accent-hover);
  color: white;
}

.footer {
  text-align: center;
  padding: 20px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Common UI Elements */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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

.btn-danger {
  background-color: var(--error-color);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}

.card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--bg-tertiary);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
}
</style>