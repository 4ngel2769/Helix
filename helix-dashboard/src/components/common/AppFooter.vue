<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="../../assets/img/logo.svg" alt="Helix" class="footer-logo" />
          <div class="footer-brand-text">
            <span class="footer-brand-name">Helix</span>
            <span class="footer-brand-tagline">Discord Bot</span>
          </div>
        </div>
        
        <div class="footer-links">
          <div class="footer-links-column">
            <h3>Resources</h3>
            <router-link to="/docs">Documentation</router-link>
            <router-link to="/commands">Commands</router-link>
            <a href="https://github.com/4ngel2769/Helix" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          
          <div class="footer-links-column">
            <h3>Support</h3>
            <a href="https://discord.gg/GapmaCt" target="_blank" rel="noopener noreferrer">Discord Server</a>
            <a href="https://github.com/4ngel2769/Helix/issues" target="_blank" rel="noopener noreferrer">Report an Issue</a>
          </div>
          
          <div class="footer-links-column">
            <h3>Legal</h3>
            <router-link to="/privacy">Privacy Policy</router-link>
            <router-link to="/terms">Terms of Service</router-link>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="copyright">
          &copy; {{ currentYear }} Helix Bot. All rights reserved.
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  computed: {
    currentYear() {
      return new Date().getFullYear();
    }
  }
};
</script>

<style scoped>
.app-footer {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 2rem 0;
  margin-top: auto;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 2rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo {
  height: 40px;
  width: 40px;
}

.footer-brand-text {
  display: flex;
  flex-direction: column;
}

.footer-brand-name {
  font-weight: 600;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.footer-brand-tagline {
  font-size: 0.8rem;
}

.footer-links {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
}

.footer-links-column {
  min-width: 120px;
}

.footer-links-column h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-size: 1rem;
}

.footer-links-column a {
  display: block;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.2s;
}

.footer-links-column a:hover {
  color: var(--text-primary);
}

.footer-bottom {
  padding-top: 1.5rem;
  border-top: 1px solid var(--bg-secondary);
  text-align: center;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
  }
  
  .footer-links {
    gap: 2rem;
  }
}
</style>