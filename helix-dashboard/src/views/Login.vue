<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-logo">
        <img src="../assets/img/logo.svg" alt="Helix" />
      </div>
      <h1>Welcome to Helix Dashboard</h1>
      <p class="login-description">
        Login with Discord to manage your server settings
      </p>
      <a href="/auth/discord" class="discord-login-button">
        <span class="discord-icon">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19.952,5.672c-1.904-1.531-4.916-1.79-5.044-1.801c-0.201-0.017-0.392,0.097-0.474,0.281 c-0.006,0.012-0.072,0.163-0.145,0.398c1.259,0.212,2.806,0.64,4.206,1.509c0.224,0.139,0.293,0.434,0.154,0.659 c-0.09,0.146-0.247,0.226-0.407,0.226c-0.086,0-0.173-0.023-0.252-0.072C15.584,5.38,12.578,5.305,12,5.305S8.415,5.38,6.011,6.872 c-0.225,0.14-0.519,0.07-0.659-0.154c-0.14-0.225-0.07-0.519,0.154-0.659c1.4-0.868,2.946-1.297,4.206-1.509 c-0.074-0.236-0.14-0.386-0.145-0.398C9.484,3.968,9.294,3.852,9.092,3.872c-0.127,0.01-3.139,0.269-5.069,1.822 C3.015,6.625,1,12.073,1,16.783c0,0.083,0.022,0.165,0.063,0.237c1.391,2.443,5.185,3.083,6.05,3.111c0.005,0,0.01,0,0.015,0 c0.153,0,0.297-0.073,0.387-0.197l0.875-1.202c-2.359-0.61-3.564-1.645-3.634-1.706c-0.198-0.175-0.217-0.477-0.042-0.675 c0.175-0.198,0.476-0.217,0.674-0.043c0.029,0.026,2.248,1.909,6.612,1.909c4.372,0,6.591-1.891,6.613-1.91 c0.198-0.172,0.5-0.154,0.674,0.045c0.174,0.198,0.155,0.499-0.042,0.673c-0.07,0.062-1.275,1.096-3.634,1.706l0.875,1.202 c0.09,0.124,0.234,0.197,0.387,0.197c0.005,0,0.01,0,0.015,0c0.865-0.027,4.659-0.667,6.05-3.111 C22.978,16.947,23,16.866,23,16.783C23,12.073,20.985,6.625,19.952,5.672z M8.891,14.87c-0.924,0-1.674-0.857-1.674-1.913 s0.749-1.913,1.674-1.913s1.674,0.857,1.674,1.913S9.816,14.87,8.891,14.87z M15.109,14.87c-0.924,0-1.674-0.857-1.674-1.913 s0.749-1.913,1.674-1.913c0.924,0,1.674,0.857,1.674,1.913S16.033,14.87,15.109,14.87z" />
          </svg>
        </span>
        Login with Discord
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      redirect: this.$route.query.redirect || '/dashboard'
    }
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 140px);
}

.login-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.login-logo {
  margin-bottom: 24px;
}

.login-logo img {
  width: 80px;
  height: 80px;
}

h1 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.login-description {
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.discord-login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #5865F2;
  color: white;
  border-radius: 4px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 1.1rem;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.discord-login-button:hover {
  background-color: #4752c4;
}

.discord-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
}
</style>