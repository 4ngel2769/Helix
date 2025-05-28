<template>
  <div class="menu-preview">
    <h3 class="preview-heading">Preview</h3>
    
    <div class="discord-message">
      <div class="discord-embed" :style="{ 'border-left-color': embedColor }">
        <div v-if="title" class="embed-title">{{ title }}</div>
        <div v-if="description" class="embed-description">{{ description }}</div>
        <div class="embed-footer">Select roles from the dropdown menu below</div>
      </div>
      
      <div class="discord-select">
        <div class="select-placeholder">
          <span>{{ selectPlaceholder }}</span>
          <span class="select-arrow">▼</span>
        </div>
      </div>
      
      <div v-if="showDropdown" class="select-dropdown">
        <div class="dropdown-options">
          <div v-for="role in roles" :key="role.roleId" class="dropdown-option">
            <div class="option-content">
              <span v-if="role.emoji" class="option-emoji">{{ role.emoji }}</span>
              <span class="option-label">{{ role.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuPreview',
  props: {
    title: {
      type: String,
      default: 'Select your roles'
    },
    description: {
      type: String,
      default: 'Click the dropdown menu below to select your roles'
    },
    roles: {
      type: Array,
      default: () => []
    },
    selectPlaceholder: {
      type: String,
      default: 'Select roles...'
    },
    embedColor: {
      type: String,
      default: '#5865F2'
    },
    showDropdown: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.menu-preview {
  width: 100%;
}

.preview-heading {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  color: var(--text-secondary);
}

.discord-message {
  border-radius: 4px;
  background-color: var(--bg-primary);
  padding: 16px;
  font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  position: relative;
}

.discord-embed {
  background-color: var(--bg-secondary);
  border-left: 4px solid;
  border-radius: 0 4px 4px 0;
  padding: 12px;
  margin-bottom: 12px;
}

.embed-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.embed-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 8px;
  white-space: pre-line;
  word-break: break-word;
}

.embed-footer {
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding-top: 8px;
  border-top: 1px solid var(--bg-tertiary);
}

.discord-select {
  background-color: var(--bg-secondary);
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.select-placeholder {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-tertiary);
  font-size: 0.9rem;
  padding: 8px 0;
}

.select-arrow {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.select-dropdown {
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  margin-top: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.dropdown-options {
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-option:hover {
  background-color: var(--bg-tertiary);
}

.option-content {
  display: flex;
  align-items: center;
}

.option-emoji {
  font-size: 1.2rem;
  margin-right: 8px;
}

.option-label {
  color: var(--text-primary);
  font-size: 0.9rem;
}
</style>