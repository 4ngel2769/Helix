<template>
  <div>
    <div v-if="error" class="error-boundary">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p class="error-message">{{ error.message }}</p>
        <button class="btn btn-primary" @click="resetError">Try Again</button>
      </div>
    </div>
    <slot v-else></slot>
  </div>
</template>

<script>
export default {
  name: 'ErrorBoundary',
  data() {
    return {
      error: null
    };
  },
  methods: {
    resetError() {
      this.error = null;
      // Emit an event in case parent needs to know we're resetting
      this.$emit('reset');
    }
  },
  errorCaptured(err, vm, info) {
    // Handle the error
    this.error = err;
    console.error(`Error captured in ErrorBoundary: ${err.message}`);
    console.error(`Component: ${vm.$options.name || 'Anonymous'}`);
    console.error(`Error Info: ${info}`);
    
    // Prevent the error from propagating further
    return false;
  }
};
</script>

<style scoped>
.error-boundary {
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  text-align: center;
}

.error-content {
  max-width: 400px;
  margin: 0 auto;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-message {
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  color: var(--error-color);
  font-family: monospace;
  white-space: pre-wrap;
  text-align: left;
}
</style>