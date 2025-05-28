import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import Dashboard from './views/Dashboard.vue';
import Login from './views/Login.vue';
import ServerManagement from './views/ServerManagement.vue';
import ReactionRoles from './views/ReactionRoles.vue';
import store from './store';

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/:guildId',
    name: 'server-management',
    component: ServerManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/:guildId/reactionroles',
    name: 'reaction-roles',
    component: ReactionRoles,
    meta: { requiresAuth: true },
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard for auth-protected routes
router.beforeEach(async (to, from, next) => {
  // Check if the route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Check if user is authenticated
    if (!store.getters.isAuthenticated) {
      const user = await store.dispatch('checkAuth');
      if (!user) {
        // Redirect to login if not authenticated
        return next({ 
          path: '/login',
          query: { redirect: to.fullPath } 
        });
      }
    }
  }
  
  next();
});

export default router;