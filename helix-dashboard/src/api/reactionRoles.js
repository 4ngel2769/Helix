const reactionRoles = {
  async getMenus(guildId) {
    const response = await fetch(`/api/guilds/${guildId}/reactionroles`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch menus');
    }
    
    return await response.json();
  },
  
  async createMenu(guildId, menuData) {
    const response = await fetch(`/api/guilds/${guildId}/reactionroles`, {
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
    
    return await response.json();
  },
  
  async updateMenu(guildId, menuId, menuData) {
    const response = await fetch(`/api/guilds/${guildId}/reactionroles/${menuId}`, {
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
    
    return await response.json();
  },
  
  async deleteMenu(guildId, menuId) {
    const response = await fetch(`/api/guilds/${guildId}/reactionroles/${menuId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete menu');
    }
    
    return await response.json();
  }
};

export default reactionRoles;