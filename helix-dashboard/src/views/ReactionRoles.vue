<template>
  <div class="reaction-roles">
    <div class="page-header">
      <div>
        <h1>{{ guild.name }} - Reaction Roles</h1>
        <p>Create and manage role selection menus for your server</p>
      </div>
      
      <button @click="showCreateModal = true" class="btn btn-primary">
        Create New Menu
      </button>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading reaction roles menus...</p>
    </div>
    
    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button @click="fetchMenus" class="btn btn-primary">Try Again</button>
    </div>
    
    <div v-else-if="menus.length === 0" class="empty-state">
      <div class="empty-icon">🎭</div>
      <h3>No Reaction Roles Menus</h3>
      <p>You haven't created any role selection menus yet.</p>
      <button @click="showCreateModal = true" class="btn btn-primary">Create Your First Menu</button>
    </div>
    
    <div v-else class="menus-container">
      <MenuCard
        v-for="menu in menus"
        :key="menu.messageId"
        :menu="menu"
        @edit="editMenu"
        @toggle="toggleMenu"
        @delete="confirmDelete"
      />
    </div>
    
    <!-- Create/Edit Modal -->
    <MenuEditor
      v-if="showCreateModal || showEditModal"
      :guild-id="guildId"
      :menu="editingMenu"
      :is-edit="showEditModal"
      @close="closeModals"
      @created="menuCreated"
      @updated="menuUpdated"
    />
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Delete Reaction Roles Menu</h3>
          <button @click="showDeleteModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete the menu "<strong>{{ deleteMenu?.title }}</strong>"?</p>
          <p>This action cannot be undone and will remove the message from Discord.</p>
        </div>
        <div class="modal-footer">
          <button @click="showDeleteModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="deleteMenuConfirmed" class="btn btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import MenuCard from '../components/reactionRoles/MenuCard';
import MenuEditor from '../components/reactionRoles/MenuEditor';

export default {
  name: 'ReactionRoles',
  components: {
    MenuCard,
    MenuEditor
  },
  props: {
    guildId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      guild: {},
      menus: [],
      loading: true,
      error: null,
      showCreateModal: false,
      showEditModal: false,
      showDeleteModal: false,
      editingMenu: null,
      deleteMenu: null
    };
  },
  methods: {
    ...mapActions(['fetchGuildDetails']),
    async fetchMenus() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await fetch(`/api/guilds/${this.guildId}/reactionroles`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch menus');
        }
        
        this.menus = await response.json();
      } catch (error) {
        console.error('Error fetching menus:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    editMenu(menu) {
      this.editingMenu = menu;
      this.showEditModal = true;
    },
    async toggleMenu(menu) {
      try {
        const response = await fetch(`/api/guilds/${this.guildId}/reactionroles/${menu.messageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            active: !menu.active
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update menu');
        }
        
        // Update local state
        const index = this.menus.findIndex(m => m.messageId === menu.messageId);
        if (index !== -1) {
          this.menus[index].active = !this.menus[index].active;
        }
      } catch (error) {
        console.error('Error toggling menu:', error);
        // Show error message
        alert(`Error: ${error.message}`);
      }
    },
    confirmDelete(menu) {
      this.deleteMenu = menu;
      this.showDeleteModal = true;
    },
    async deleteMenuConfirmed() {
      try {
        const response = await fetch(`/api/guilds/${this.guildId}/reactionroles/${this.deleteMenu.messageId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete menu');
        }
        
        // Remove from local state
        this.menus = this.menus.filter(m => m.messageId !== this.deleteMenu.messageId);
        this.showDeleteModal = false;
        this.deleteMenu = null;
      } catch (error) {
        console.error('Error deleting menu:', error);
        alert(`Error: ${error.message}`);
      }
    },
    closeModals() {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.editingMenu = null;
    },
    menuCreated(newMenu) {
      this.menus.push(newMenu);
      this.showCreateModal = false;
    },
    menuUpdated(updatedMenu) {
      const index = this.menus.findIndex(m => m.messageId === updatedMenu.messageId);
      if (index !== -1) {
        this.menus[index] = { ...this.menus[index], ...updatedMenu };
      }
      this.showEditModal = false;
      this.editingMenu = null;
    },
    async loadGuildDetails() {
      try {
        this.guild = await this.fetchGuildDetails(this.guildId);
      } catch (error) {
        console.error('Error loading guild details:', error);
      }
    }
  },
  async created() {
    await this.loadGuildDetails();
    await this.fetchMenus();
  }
};
</script>

<style scoped>
.reaction-roles {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header p {
  color: var(--text-secondary);
  margin-top: 4px;
}

.menus-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.loading, .error-container {
  text-align: center;
  padding: 40px 0;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
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

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
}

.btn-secondary:hover {
  background-color: #292b2f;
}
</style>