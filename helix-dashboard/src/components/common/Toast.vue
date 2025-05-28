<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast" 
        :class="toast.type"
      >
        <div class="toast-content">
          <span class="toast-icon" v-if="getIcon(toast.type)">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">&times;</button>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'Toast',
  data() {
    return {
      toasts: [],
      nextId: 0
    };
  },
  methods: {
    showToast(type, message, timeout = 4000) {
      const id = this.nextId++;
      const toast = {
        id,
        type,
        message,
      };
      
      this.toasts.push(toast);
      
      // Auto-remove toast after timeout
      if (timeout > 0) {
        setTimeout(() => {
          this.removeToast(id);
        }, timeout);
      }
      
      return id;
    },
    
    removeToast(id) {
      const index = this.toasts.findIndex(toast => toast.id === id);
      if (index !== -1) {
        this.toasts.splice(index, 1);
      }
    },
    
    getIcon(type) {
      switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return '';
      }
    }
  },
  created() {
    // Register global handlers
    this.$root.$on('show-toast', ({ type, message, timeout }) => {
      this.showToast(type, message, timeout);
    });
  },
  beforeUnmount() {
    // Clean up event listeners
    this.$root.$off('show-toast');
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 320px;
  width: 100%;
}

.toast {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 12px 16px;
  border-radius: 4px;
  background-color: var(--bg-secondary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: var(--text-primary);
  animation: slide-in 0.3s ease-out;
}

.toast-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.toast-icon {
  margin-right: 10px;
  font-size: 1.1rem;
}

.toast-message {
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
  line-height: 1;
}

.toast-close:hover {
  color: var(--text-primary);
}

.toast.success {
  border-left: 4px solid var(--success-color);
}

.toast.error {
  border-left: 4px solid var(--error-color);
}

.toast.warning {
  border-left: 4px solid var(--warning-color);
}

.toast.info {
  border-left: 4px solid var(--accent-color);
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slide-in {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>