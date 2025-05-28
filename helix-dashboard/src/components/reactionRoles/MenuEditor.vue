<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>{{ isEdit ? 'Edit Reaction Roles Menu' : 'Create Reaction Roles Menu' }}</h3>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <!-- Basic Settings -->
          <div class="form-section">
            <h4>Basic Settings</h4>
            
            <div class="form-group">
              <label for="title" class="form-label">Title</label>
              <input
                id="title"
                v-model="form.title"
                class="form-input"
                type="text"
                placeholder="Select your roles"
                required
                maxlength="256"
              >
            </div>
            
            <div class="form-group">
              <label for="description" class="form-label">Description</label>
              <textarea
                id="description"
                v-model="form.description"
                class="form-textarea"
                placeholder="Click the menu below to select your roles"
                required
                maxlength="4000"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group" v-if="!isEdit">
              <label for="channel" class="form-label">Channel</label>
              <select
                id="channel"
                v-model="form.channelId"
                class="form-select"
                required
              >
                <option disabled value="">Select a channel</option>
                <option v-for="channel in textChannels" :key="channel.id" :value="channel.id">
                  # {{ channel.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="max-selections" class="form-label">Maximum Selections</label>
              <div class="form-help">How many roles can a user select at once? (0 for unlimited)</div>
              <input
                id="max-selections"
                v-model.number="form.maxSelections"
                class="form-input"
                type="number"
                min="0"
                :max="form.roles.length"
              >
            </div>
          </div>
          
          <!-- Roles Section -->
          <div class="form-section">
            <h4>Roles</h4>
            <p class="section-description">
              Configure the roles users can select from the dropdown menu
            </p>
            
            <!-- Role List -->
            <div v-if="form.roles.length > 0" class="roles-list">
              <div v-for="(role, index) in form.roles" :key="index" class="role-item">
                <div class="role-info">
                  <div class="role-color" :style="{ backgroundColor: role.color }"></div>
                  <div class="role-details">
                    <div class="role-name">{{ role.name }}</div>
                    <div class="role-label">Label: {{ role.label }}</div>
                  </div>
                  <div v-if="role.emoji" class="role-emoji">{{ role.emoji }}</div>
                </div>
                <div class="role-actions">
                  <button type="button" @click="editRole(index)" class="btn-icon">✏️</button>
                  <button type="button" @click="removeRole(index)" class="btn-icon delete">🗑️</button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-roles">
              <p>No roles added yet</p>
            </div>
            
            <!-- Add Role Button -->
            <button
              type="button"
              @click="showAddRoleModal = true"
              class="btn btn-outline btn-add-role"
              :disabled="availableRoles.length === 0"
            >
              <span>+</span> Add Role
            </button>
          </div>
          
          <!-- Preview Section -->
          <div class="form-section">
            <h4>Preview</h4>
            <div class="preview-container">
              <div class="preview-embed">
                <div class="preview-embed-title">{{ form.title || 'Menu Title' }}</div>
                <div class="preview-embed-description">{{ form.description || 'Menu description will appear here' }}</div>
                <div class="preview-embed-footer">Select roles from the dropdown menu below</div>
              </div>
              
              <div class="preview-select">
                <div class="preview-select-placeholder">
                  Select roles...
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="close" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">{{ isEdit ? 'Save Changes' : 'Create Menu' }}</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Add Role Modal -->
    <div v-if="showAddRoleModal" class="modal-overlay nested">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add Role</h3>
          <button @click="showAddRoleModal = false" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="role-select" class="form-label">Role</label>
            <select
              id="role-select"
              v-model="newRole.roleId"
              class="form-select"
              required
            >
              <option disabled value="">Select a role</option>
              <option v-for="role in availableRoles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="role-label" class="form-label">Label</label>
            <input
              id="role-label"
              v-model="newRole.label"
              class="form-input"
              type="text"
              placeholder="Label shown in dropdown menu"
              maxlength="100"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="role-emoji" class="form-label">Emoji (optional)</label>
            <input
              id="role-emoji"
              v-model="newRole.emoji"
              class="form-input"
              type="text"
              placeholder="Unicode emoji or Discord emoji (e.g. :smile:)"
            >
            <div class="form-help">Use a Unicode emoji or Discord custom emoji format like &lt;:name:id&gt;</div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddRoleModal = false" class="btn btn-secondary">Cancel</button>
            <button type="button" @click="addRole" class="btn btn-primary">Add Role</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Role Modal -->
    <div v-if="showEditRoleModal" class="modal-overlay nested">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Edit Role</h3>
          <button @click="showEditRoleModal = false" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-role-label" class="form-label">Label</label>
            <input
              id="edit-role-label"
              v-model="editingRole.label"
              class="form-input"
              type="text"
              placeholder="Label shown in dropdown menu"
              maxlength="100"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="edit-role-emoji" class="form-label">Emoji (optional)</label>
            <input
              id="edit-role-emoji"
              v-model="editingRole.emoji"
              class="form-input"
              type="text"
              placeholder="Unicode emoji or Discord emoji (e.g. :smile:)"
            >
            <div class="form-help">Use a Unicode emoji or Discord custom emoji format like &lt;:name:id&gt;</div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showEditRoleModal = false" class="btn btn-secondary">Cancel</button>
            <button type="button" @click="updateRole" class="btn btn-primary">Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuEditor',
  props: {
    guildId: {
      type: String,
      required: true
    },
    menu: {
      type: Object,
      default: null
    },
    isEdit: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      textChannels: [],
      guildRoles: [],
      form: {
        title: '',
        description: '',
        channelId: '',
        maxSelections: 0,
        roles: []
      },
      newRole: {
        roleId: '',
        label: '',
        emoji: ''
      },
      editingRole: {
        index: -1,
        label: '',
        emoji: ''
      },
      showAddRoleModal: false,
      showEditRoleModal: false,
      loading: false,
      error: null
    };
  },
  computed: {
    availableRoles() {
      // Filter out roles that are already selected
      const selectedRoleIds = this.form.roles.map(r => r.roleId);
      return this.guildRoles.filter(role => 
        !selectedRoleIds.includes(role.id) && 
        !role.managed && 
        !role.name.includes('@everyone')
      );
    }
  },
  methods: {
    async fetchGuildData() {
      try {
        this.loading = true;
        
        // Fetch channels
        const channelsResponse = await fetch(`/api/guilds/${this.guildId}/channels`, {
          credentials: 'include'
        });
        
        if (!channelsResponse.ok) {
          throw new Error('Failed to fetch channels');
        }
        
        const channels = await channelsResponse.json();
        this.textChannels = channels.filter(channel => 
          channel.type === 0 && // GUILD_TEXT
          channel.permissionsFor && 
          channel.permissionsFor.SEND_MESSAGES
        );
        
        // Fetch roles
        const rolesResponse = await fetch(`/api/guilds/${this.guildId}/roles`, {
          credentials: 'include'
        });
        
        if (!rolesResponse.ok) {
          throw new Error('Failed to fetch roles');
        }
        
        const roles = await rolesResponse.json();
        this.guildRoles = roles.sort((a, b) => b.position - a.position); // Sort by position
      } catch (error) {
        console.error('Error fetching guild data:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    initForm() {
      if (this.isEdit && this.menu) {
        // Populate form with menu data for editing
        this.form = {
          title: this.menu.title,
          description: this.menu.description,
          channelId: this.menu.channelId,
          maxSelections: this.menu.maxSelections || 0,
          roles: this.menu.roles.map(role => ({
            roleId: role.roleId,
            label: role.label,
            emoji: role.emoji,
            // Add additional data from guild roles
            name: role.name || this.getRoleName(role.roleId),
            color: role.color || this.getRoleColor(role.roleId)
          }))
        };
      } else {
        // Initialize empty form for creation
        this.form = {
          title: '',
          description: '',
          channelId: '',
          maxSelections: 0,
          roles: []
        };
      }
    },
    getRoleName(roleId) {
      const role = this.guildRoles.find(r => r.id === roleId);
      return role ? role.name : 'Unknown Role';
    },
    getRoleColor(roleId) {
      const role = this.guildRoles.find(r => r.id === roleId);
      return role ? role.color || '#99AAB5' : '#99AAB5';
    },
    addRole() {
      if (!this.newRole.roleId || !this.newRole.label) return;
      
      const role = this.guildRoles.find(r => r.id === this.newRole.roleId);
      if (!role) return;
      
      this.form.roles.push({
        roleId: this.newRole.roleId,
        label: this.newRole.label,
        emoji: this.newRole.emoji || undefined,
        name: role.name,
        color: role.color || '#99AAB5'
      });
      
      // Reset form
      this.newRole = {
        roleId: '',
        label: '',
        emoji: ''
      };
      
      this.showAddRoleModal = false;
    },
    editRole(index) {
      const role = this.form.roles[index];
      this.editingRole = {
        index,
        label: role.label,
        emoji: role.emoji || ''
      };
      this.showEditRoleModal = true;
    },
    updateRole() {
      if (this.editingRole.index < 0 || !this.editingRole.label) return;
      
      // Update the role
      this.form.roles[this.editingRole.index] = {
        ...this.form.roles[this.editingRole.index],
        label: this.editingRole.label,
        emoji: this.editingRole.emoji || undefined
      };
      
      this.showEditRoleModal = false;
      this.editingRole = {
        index: -1,
        label: '',
        emoji: ''
      };
    },
    removeRole(index) {
      this.form.roles.splice(index, 1);
      
      // Adjust maxSelections if needed
      if (this.form.maxSelections > this.form.roles.length) {
        this.form.maxSelections = this.form.roles.length;
      }
    },
    async handleSubmit() {
      try {
        if (this.form.roles.length === 0) {
          alert('You must add at least one role');
          return;
        }
        
        this.loading = true;
        
        // Prepare data for API
        const menuData = {
          title: this.form.title,
          description: this.form.description,
          roles: this.form.roles.map(role => ({
            roleId: role.roleId,
            label: role.label,
            emoji: role.emoji
          })),
          maxSelections: this.form.maxSelections || 0
        };
        
        // Add channelId for create operation only
        if (!this.isEdit) {
          menuData.channelId = this.form.channelId;
        }
        
        if (this.isEdit) {
          // Update existing menu
          const response = await fetch(`/api/guilds/${this.guildId}/reactionroles/${this.menu.messageId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(menuData),
            credentials: 'include'
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update menu');
          }
          
          const result = await response.json();
          this.$emit('updated', {
            ...this.menu,
            ...menuData
          });
        } else {
          // Create new menu
          const response = await fetch(`/api/guilds/${this.guildId}/reactionroles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(menuData),
            credentials: 'include'
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create menu');
          }
          
          const newMenu = await response.json();
          this.$emit('created', newMenu);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert(`Error: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },
    close() {
      this.$emit('close');
    }
  },
  async created() {
    await this.fetchGuildData();
    this.initForm();
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-overlay.nested {
  z-index: 101;
}

.modal-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.modal-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--text-primary);
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h4 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.section-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.form-help {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--bg-tertiary);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background-color: #292b2f;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.btn-outline:hover {
  background-color: rgba(88, 101, 242, 0.1);
}

.btn-outline:disabled {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.btn-add-role {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
  margin-top: 12px;
}

.btn-add-role span {
  font-size: 1.2rem;
  line-height: 1;
}

.empty-roles {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
  border-radius: 4px;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  padding: 8px 12px;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.role-details {
  display: flex;
  flex-direction: column;
}

.role-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.role-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.role-emoji {
  margin-left: 8px;
}

.role-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.1);
}

.btn-icon.delete:hover {
  color: var(--error-color);
}

.preview-container {
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  padding: 16px;
}

.preview-embed {
  background-color: var(--bg-secondary);
  border-left: 4px solid var(--accent-color);
  padding: 12px;
  border-radius: 0 4px 4px 0;
  margin-bottom: 12px;
}

.preview-embed-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 8px;
}

.preview-embed-description {
  font-size: 0.9rem;
  margin-bottom: 8px;
  white-space: pre-line;
}

.preview-embed-footer {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding-top: 8px;
  border-top: 1px solid var(--bg-tertiary);
}

.preview-select {
  background-color: var(--bg-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 4px;
  padding: 8px 12px;
}

.preview-select-placeholder {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>