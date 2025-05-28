<template>
  <div class="role-selector">
    <div class="roles-container">
      <!-- Available Roles -->
      <div class="roles-section">
        <h3>Available Roles</h3>
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search roles..." 
            class="search-input"
          />
        </div>
        
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Loading roles...</p>
        </div>
        
        <div v-else-if="filteredAvailableRoles.length === 0" class="empty-roles">
          <p>{{ searchQuery ? 'No matching roles found' : 'No available roles' }}</p>
        </div>
        
        <div v-else class="roles-list">
          <div 
            v-for="role in filteredAvailableRoles" 
            :key="role.id"
            class="role-item"
            @click="addRole(role)"
            :class="{ 'disabled': isRoleDisabled(role) }"
          >
            <div 
              class="role-color" 
              :style="{ backgroundColor: role.hexColor || '#99AAB5' }"
            ></div>
            <div class="role-name">{{ role.name }}</div>
            <div class="role-action">
              <button 
                class="btn-icon btn-add"
                :disabled="isRoleDisabled(role)"
                @click.stop="addRole(role)"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Selected Roles -->
      <div class="roles-section">
        <h3>Selected Roles</h3>
        <div v-if="selectedRoles.length === 0" class="empty-roles">
          <p>No roles selected yet</p>
        </div>
        
        <div v-else class="roles-list selected-list">
          <div 
            v-for="(role, index) in selectedRoles" 
            :key="role.roleId"
            class="role-item selected-role"
          >
            <div class="role-drag-handle">☰</div>
            <div 
              class="role-color" 
              :style="{ backgroundColor: role.color || '#99AAB5' }"
            ></div>
            <div class="role-details">
              <div class="role-name">{{ role.name }}</div>
              <div class="role-label">Label: {{ role.label }}</div>
              <div v-if="role.emoji" class="role-emoji">
                Emoji: {{ role.emoji }}
              </div>
            </div>
            <div class="role-actions">
              <button class="btn-icon btn-edit" @click="editRole(index)">
                ✎
              </button>
              <button class="btn-icon btn-remove" @click="removeRole(index)">
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Role Edit/Add Modal -->
    <div v-if="showRoleModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ isEditing ? 'Edit Role' : 'Add Role' }}</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div v-if="!isEditing" class="form-group">
            <label class="form-label">Role</label>
            <div class="selected-role-display">
              <div 
                class="role-color" 
                :style="{ backgroundColor: currentRole.color || '#99AAB5' }"
              ></div>
              <span>{{ currentRole.name }}</span>
            </div>
          </div>
          
          <div class="form-group">
            <label for="role-label" class="form-label">Label</label>
            <input 
              id="role-label" 
              v-model="currentRole.label" 
              class="form-input"
              placeholder="Label shown in dropdown"
              maxlength="100"
              required
              @keydown.enter="saveRole"
            />
            <div class="form-help">
              This is the text shown in the dropdown menu (max 100 chars)
            </div>
          </div>
          
          <div class="form-group">
            <label for="role-emoji" class="form-label">Emoji (optional)</label>
            <div class="emoji-selector">
              <input 
                id="role-emoji" 
                v-model="currentRole.emoji" 
                class="form-input"
                placeholder="😀 or Discord emoji format"
                maxlength="50"
                @keydown.enter="saveRole"
              />
              <button type="button" class="btn btn-icon" @click="openEmojiPicker">
                😀
              </button>
            </div>
            <div class="form-help">
              Can be a Unicode emoji or Discord emoji format like &lt;:name:id&gt;
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button @click="saveRole" class="btn btn-primary">
            {{ isEditing ? 'Update' : 'Add' }} Role
          </button>
        </div>
      </div>
    </div>
    
    <!-- Emoji Picker Modal -->
    <EmojiPicker 
      v-if="showEmojiPicker" 
      @select="selectEmoji"
      @close="showEmojiPicker = false"
    />
  </div>
</template>

<script>
import EmojiPicker from './EmojiPicker';

export default {
  name: 'RoleSelector',
  components: {
    EmojiPicker
  },
  props: {
    guildId: {
      type: String,
      required: true
    },
    value: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      availableRoles: [],
      selectedRoles: [],
      loading: false,
      searchQuery: '',
      currentRole: null,
      showRoleModal: false,
      showEmojiPicker: false,
      isEditing: false,
      editingIndex: -1
    };
  },
  computed: {
    filteredAvailableRoles() {
      if (!this.searchQuery.trim()) {
        return this.availableRoles;
      }
      
      const query = this.searchQuery.toLowerCase().trim();
      return this.availableRoles.filter(role => 
        role.name.toLowerCase().includes(query)
      );
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        this.selectedRoles = [...(newVal || [])];
      }
    },
    selectedRoles: {
      deep: true,
      handler(newVal) {
        this.$emit('input', newVal);
      }
    }
  },
  methods: {
    async fetchRoles() {
      this.loading = true;
      
      try {
        const response = await fetch(`/api/guilds/${this.guildId}/roles`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch roles');
        }
        
        const roles = await response.json();
        
        // Filter out @everyone and managed roles
        this.availableRoles = roles.filter(role => 
          !role.managed && 
          role.name !== '@everyone' &&
          role.name !== '@here'
        );
      } catch (error) {
        console.error('Error fetching roles:', error);
        this.$root.$emit('show-toast', {
          type: 'error',
          message: 'Failed to load server roles'
        });
      } finally {
        this.loading = false;
      }
    },
    
    isRoleDisabled(role) {
      // Check if role is already selected
      return this.selectedRoles.some(r => r.roleId === role.id);
    },
    
    addRole(role) {
      if (this.isRoleDisabled(role)) return;
      
      this.currentRole = {
        roleId: role.id,
        name: role.name,
        color: role.hexColor || '#99AAB5',
        label: role.name,
        emoji: ''
      };
      
      this.isEditing = false;
      this.showRoleModal = true;
    },
    
    editRole(index) {
      this.editingIndex = index;
      this.currentRole = { ...this.selectedRoles[index] };
      this.isEditing = true;
      this.showRoleModal = true;
    },
    
    removeRole(index) {
      this.selectedRoles.splice(index, 1);
    },
    
    saveRole() {
      if (!this.currentRole.label.trim()) {
        this.$root.$emit('show-toast', {
          type: 'error',
          message: 'Role label is required'
        });
        return;
      }
      
      if (this.isEditing) {
        // Update existing role
        this.selectedRoles.splice(this.editingIndex, 1, { ...this.currentRole });
      } else {
        // Add new role
        this.selectedRoles.push({ ...this.currentRole });
      }
      
      this.closeModal();
    },
    
    closeModal() {
      this.showRoleModal = false;
      this.currentRole = null;
      this.isEditing = false;
      this.editingIndex = -1;
    },
    
    openEmojiPicker() {
      this.showEmojiPicker = true;
    },
    
    selectEmoji(emoji) {
      if (this.currentRole) {
        this.currentRole.emoji = emoji;
      }
      this.showEmojiPicker = false;
    }
  },
  created() {
    this.fetchRoles();
  }
};
</script>

<style scoped>
.role-selector {
  width: 100%;
}

.roles-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .roles-container {
    grid-template-columns: 1fr;
  }
}

.roles-section {
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  padding: 16px;
}

.roles-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 16px;
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--bg-primary);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 14px;
}

.roles-list {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 4px;
  background-color: var(--bg-primary);
}

.role-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--bg-tertiary);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.role-item:hover {
  background-color: var(--bg-secondary);
}

.role-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-item.selected-role {
  cursor: default;
}

.role-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.role-name {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-details {
  flex: 1;
  overflow: hidden;
}

.role-label, .role-emoji {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-action {
  visibility: hidden;
}

.role-item:hover .role-action {
  visibility: visible;
}

.role-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon.btn-add {
  color: var(--success-color);
}

.btn-icon.btn-edit {
  color: var(--warning-color);
}

.btn-icon.btn-remove {
  color: var(--error-color);
}

.btn-icon.btn-add:disabled {
  color: var(--text-secondary);
  cursor: not-allowed;
}

.role-drag-handle {
  cursor: grab;
  color: var(--text-secondary);
  font-size: 12px;
}

.empty-roles {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  background-color: var(--bg-primary);
  border-radius: 4px;
}

.loading {
  padding: 24px;
  text-align: center;
  background-color: var(--bg-primary);
  border-radius: 4px;
}

.spinner {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--accent-color);
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid var(--bg-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--bg-tertiary);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 14px;
}

.form-help {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.emoji-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.emoji-selector .form-input {
  flex: 1;
}

.emoji-selector .btn-icon {
  width: 32px;
  height: 32px;
  font-size: 18px;
}
</style>