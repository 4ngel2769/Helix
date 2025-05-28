const auth = {
  async getUser() {
    const response = await fetch('/api/auth/user', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return { authenticated: false, user: null };
      }
      
      const data = await response.json();
      throw new Error(data.error || 'Authentication error');
    }
    
    return await response.json();
  },
  
  async logout() {
    await fetch('/auth/logout', {
      credentials: 'include'
    });
  }
};

export default auth;