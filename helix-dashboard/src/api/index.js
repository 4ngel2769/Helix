import auth from './auth';
import reactionRoles from './reactionRoles';

// Base API wrapper
const api = {
  auth,
  reactionRoles,
  
  async getGuilds() {
    const response = await fetch('/api/guilds', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch guilds');
    }
    
    return await response.json();
  },
  
  async getGuild(guildId) {
    const response = await fetch(`/api/guilds/${guildId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch guild');
    }
    
    return await response.json();
  },
  
  async generateInvite(guildId) {
    const response = await fetch(`/api/guilds/${guildId}/invite`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to generate invite');
    }
    
    return await response.json();
  }
};

export default api;