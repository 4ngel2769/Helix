import { createStore } from 'vuex';
import api from './api';

export default createStore({
  state: {
    user: null,
    guilds: {
      list: [],
      loading: false,
      error: null
    },
    currentGuild: {
      data: null,
      loading: false,
      error: null
    }
  },
  getters: {
    isAuthenticated(state) {
      return !!state.user;
    },
    userGuilds(state) {
      return state.guilds.list;
    },
    managedGuilds(state) {
      return state.guilds.list.filter(guild => guild.canManage);
    }
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
    },
    SET_GUILDS(state, guilds) {
      state.guilds.list = guilds;
    },
    SET_GUILDS_LOADING(state, loading) {
      state.guilds.loading = loading;
    },
    SET_GUILDS_ERROR(state, error) {
      state.guilds.error = error;
    },
    SET_CURRENT_GUILD(state, guild) {
      state.currentGuild.data = guild;
    },
    SET_CURRENT_GUILD_LOADING(state, loading) {
      state.currentGuild.loading = loading;
    },
    SET_CURRENT_GUILD_ERROR(state, error) {
      state.currentGuild.error = error;
    }
  },
  actions: {
    async fetchUser({ commit }) {
      try {
        const response = await api.auth.getUser();
        commit('SET_USER', response.user);
        return response.user;
      } catch (error) {
        console.error('Error fetching user:', error);
        commit('SET_USER', null);
        return null;
      }
    },
    
    async checkAuth({ dispatch }) {
      try {
        return await dispatch('fetchUser');
      } catch (error) {
        console.error('Auth check failed:', error);
        return null;
      }
    },
    
    async logout({ commit }) {
      try {
        await api.auth.logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
      
      commit('SET_USER', null);
      window.location.href = '/';
    },
    
    async fetchGuilds({ commit }) {
      commit('SET_GUILDS_LOADING', true);
      commit('SET_GUILDS_ERROR', null);
      
      try {
        const response = await api.getGuilds();
        commit('SET_GUILDS', response);
        return response;
      } catch (error) {
        console.error('Error fetching guilds:', error);
        commit('SET_GUILDS_ERROR', error.message || 'Failed to fetch guilds');
        return [];
      } finally {
        commit('SET_GUILDS_LOADING', false);
      }
    },
    
    async fetchGuildDetails({ commit }, guildId) {
      commit('SET_CURRENT_GUILD_LOADING', true);
      commit('SET_CURRENT_GUILD_ERROR', null);
      
      try {
        const response = await api.getGuild(guildId);
        commit('SET_CURRENT_GUILD', response);
        return response;
      } catch (error) {
        console.error(`Error fetching guild ${guildId}:`, error);
        commit('SET_CURRENT_GUILD_ERROR', error.message || 'Failed to fetch guild details');
        throw error;
      } finally {
        commit('SET_CURRENT_GUILD_LOADING', false);
      }
    },
    
    async generateBotInvite(_, guildId) {
      try {
        const response = await api.generateInvite(guildId);
        return response.inviteUrl;
      } catch (error) {
        console.error('Error generating invite:', error);
        throw error;
      }
    }
  }
});