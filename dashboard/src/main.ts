import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const theme = localStorage.getItem('helix-theme');
if (theme === 'light' || theme === 'dark') {
	document.documentElement.dataset.theme = theme;
}

const app = mount(App, { target: document.getElementById('app')! });

export default app;
