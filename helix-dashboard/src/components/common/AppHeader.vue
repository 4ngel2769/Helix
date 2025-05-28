<template>
  <header class="app-header">
    <div class="container">
      <div class="header-left">
        <router-link to="/" class="brand">
          <img src="../../assets/img/logo.svg" alt="Helix" class="logo" />
          <span class="brand-name">Helix</span>
        </router-link>
      </div>
      
      <nav class="header-nav" :class="{ 'nav-open': menuOpen }">
        <router-link to="/" class="nav-item" exact-active-class="active">Home</router-link>
        <router-link v-if="isAuthenticated" to="/dashboard" class="nav-item" active-class="active">Dashboard</router-link>
      </nav>
      
      <div class="header-right">
        <div v-if="isAuthenticated" class="user-section">
          <div class="user-dropdown" @click="toggleUserMenu" ref="userDropdown">
            <img :src="userAvatar" class="user-avatar" :alt="userName" />
            <span class="user-name">{{ userName }}</span>
            <span class="dropdown-arrow">▼</span>
            
            <div v-if="userMenuOpen" class="dropdown-menu">
              <div class="dropdown-user-info">
                <img :src="userAvatar" class="dropdown-avatar" :alt="userName" />
                <div>
                  <div class="dropdown-username">{{ userName }}</div>
                  <div class="dropdown-discriminator">{{ userDiscriminator }}</div>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <router-link to="/dashboard" class="dropdown-item">
                <span class="dropdown-icon">📊</span>
                Dashboard
              </router-link>
              <a href="#" @click.prevent="logout" class="dropdown-item">
                <span class="dropdown-icon">🚪</span>
                Logout
              </a>
            </div>
          </div>
        </div>
        
        <router-link v-else to="/login" class="login-btn">
          Login with Discord
        </router-link>
        
        <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>
      </div>
    </div>
  </header>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'AppHeader',
  data() {
    return {
      menuOpen: false,
      userMenuOpen: false
    };
  },
  computed: {
    ...mapGetters(['isAuthenticated', 'user']),
    
    userAvatar() {
      return this.user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';
    },
    
    userName() {
      return this.user?.username || 'User';
    },
    
    userDiscriminator() {
      return this.user?.discriminator ? `#${this.user.discriminator}` : '';
    }
  },
  methods: {
    ...mapActions(['logout']),
    
    toggleMenu() {
      this.menuOpen = !this.menuOpen;
    },
    
    toggleUserMenu() {
      this.userMenuOpen = !this.userMenuOpen;
    },
    
    closeUserMenu(e) {
      if (this.$refs.userDropdown && !this.$refs.userDropdown.contains(e.target)) {
        this.userMenuOpen = false;
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.closeUserMenu);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeUserMenu);
  }
};
</script>

<style scoped>
.app-header {
  background-color: var(--bg-tertiary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 64px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 600;
  gap: 10px;
}

.logo {
  height: 32px;
  width: 32px;
}

.brand-name {
  font-size: 1.25rem;
}

.header-nav {
  display: flex;
  gap: 1.5rem;
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  padding: 8px 0;
  position: relative;
}

.nav-item:hover {
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--text-primary);
}

.nav-item.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--accent-color);
  border-radius: 3px 3px 0 0;
}

.login-btn {
  background-color: var(--accent-color);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.login-btn:hover {
  background-color: var(--accent-hover);
}

.user-section {
  position: relative;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.user-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.dropdown-arrow {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  width: 220px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.dropdown-user-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 16px;
}

.dropdown-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.dropdown-username {
  font-weight: 600;
}

.dropdown-discriminator {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--bg-tertiary);
  margin: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: var(--text-primary);
  text-decoration: none;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: var(--bg-tertiary);
}

.dropdown-icon {
  font-size: 1.1rem;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
}

.menu-toggle .bar {
  display: block;
  width: 24px;
  height: 2px;
  margin: 5px auto;
  background-color: var(--text-primary);
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .header-nav {
    position: fixed;
    top: 64px;
    left: 0;
    width: 100%;
    background-color: var(--bg-tertiary);
    flex-direction: column;
    gap: 0;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    z-index: -1;
    opacity: 0;
  }
  
  .header-nav.nav-open {
    transform: translateY(0);
    opacity: 1;
    z-index: 10;
  }
  
  .nav-item {
    padding: 16px;
    border-bottom: 1px solid var(--bg-primary);
    width: 100%;
    text-align: center;
  }
  
  .nav-item.active::after {
    display: none;
  }
  
  .menu-toggle {
    display: block;
    margin-left: 16px;
  }
  
  .menu-toggle.active .bar:nth-child(1) {
    transform: rotate(-45deg) translate(-5px, 6px);
  }
  
  .menu-toggle.active .bar:nth-child(2) {
    opacity: 0;
  }
  
  .menu-toggle.active .bar:nth-child(3) {
    transform: rotate(45deg) translate(-5px, -6px);
  }
}
</style>