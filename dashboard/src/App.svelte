<script lang="ts">
	import { onMount } from 'svelte';
	import { loadSession, logout, session } from './lib/session.svelte';
	import { linkProps, match, navigate, path } from './lib/router.svelte';
	import Servers from './pages/Servers.svelte';
	import GuildLayout from './pages/GuildLayout.svelte';

	let currentTheme = $state(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

	function toggleTheme(): void {
		currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = currentTheme;
		localStorage.setItem('helix-theme', currentTheme);
	}

	async function doLogout(): Promise<void> {
		await logout();
		navigate('/');
	}

	onMount(() => {
		void loadSession();
	});

	const home = linkProps('/panel');
	const guildParams = $derived(match('/panel/guilds/:guildId/:section'));
	const onPanel = $derived(path() === '/panel' || path().startsWith('/panel/'));

	$effect(() => {
		if (path() === '/') navigate('/panel');
	});
</script>

<header class="topbar">
	<a {...home} class="brand"><span class="brand-mark">H</span> Helix</a>
	<span class="tag">Dashboard</span>
	<div class="topbar-spacer"></div>
	<button class="icon-btn" onclick={toggleTheme} aria-label="Toggle color theme">
		{currentTheme === 'dark' ? 'Light' : 'Dark'}
	</button>
	{#if session.user}
		<span class="user-chip">
			{#if session.user.avatarUrl}<img src={session.user.avatarUrl} alt="" />{/if}
			{session.user.username}
		</span>
		<button class="btn btn-ghost btn-sm" onclick={doLogout}>Log out</button>
	{/if}
</header>

{#if !session.loaded}
	<div class="page"><p class="loading">Loading…</p></div>
{:else if guildParams}
	<GuildLayout guildId={guildParams.guildId!} section={guildParams.section!} />
{:else if onPanel}
	<Servers />
{:else}
	<div class="page">
		<div class="empty">
			<h2>Page not found</h2>
			<p class="muted">The page <span class="mono">{path()}</span> does not exist.</p>
			<p style="margin-top: 12px"><a {...home}>Back to servers</a></p>
		</div>
	</div>
{/if}
