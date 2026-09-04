<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry, loadGuild, session } from '../lib/session.svelte';
	import { go, guildIcon } from '../lib/utils';
	import NavLink from '../components/NavLink.svelte';
	import Overview from './guild/Overview.svelte';
	import General from './guild/General.svelte';
	import Modules from './guild/Modules.svelte';
	import Logging from './guild/Logging.svelte';
	import Welcome from './guild/Welcome.svelte';
	import Verification from './guild/Verification.svelte';
	import Automod from './guild/Automod.svelte';
	import Moderation from './guild/Moderation.svelte';
	import ReactionRoles from './guild/ReactionRoles.svelte';
	import Messages from './guild/Messages.svelte';

	let { guildId, section }: { guildId: string; section: string } = $props();

	const sections = [
		{ id: 'dashboard', label: 'Overview' },
		{ id: 'general', label: 'General' },
		{ id: 'modules', label: 'Modules' },
		{ id: 'logging', label: 'Logging' },
		{ id: 'welcome', label: 'Welcome' },
		{ id: 'verification', label: 'Verification' },
		{ id: 'automod', label: 'AutoMod' },
		{ id: 'moderation', label: 'Moderation' },
		{ id: 'reaction-roles', label: 'Reaction Roles' },
		{ id: 'messages', label: 'Messages' }
	];

	const validSections = new Set(sections.map((s) => s.id));

	onMount(() => {
		if (session.user) void loadGuild(guildId);
	});

	$effect(() => {
		if (session.user) void loadGuild(guildId);
	});

	const entry = $derived(guildEntry(guildId));
</script>

{#if !session.user}
	<div class="page">
		<div class="empty">
			<h2>Log in required</h2>
			<p><a href="/api/auth/login">Log in with Discord</a> to manage this server.</p>
		</div>
	</div>
{:else}
	<div class="guild-shell">
		<aside class="sidebar">
			<a href="/panel" onclick={go('/panel')} class="nav-link" style="margin-bottom: 4px;">← All servers</a>
			{#if entry.detail}
				<div class="guild-switch">
					<img src={guildIcon(entry.detail.icon, entry.detail.name, 72)} alt="" />
					<div>
						<div class="g-name">{entry.detail.name}</div>
						<div class="small muted mono">{entry.detail.id}</div>
					</div>
				</div>
			{/if}
			<div class="nav-label">Settings</div>
			{#each sections as s (s.id)}
				<NavLink to={`/panel/guilds/${guildId}/${s.id}`} label={s.label} />
			{/each}
			<div class="sidebar-foot">
				<div class="small muted">Signed in as {session.user.username}</div>
			</div>
		</aside>
		<main class="guild-main">
			<div class="page">
				{#if entry.loading && !entry.detail}
					<p class="loading">Loading server…</p>
				{:else if entry.error}
					<div class="notice notice-error">{entry.error}</div>
				{:else if !validSections.has(section)}
					<div class="empty"><h2>Unknown section</h2></div>
				{:else if section === 'dashboard'}
					<Overview {guildId} />
				{:else if section === 'general'}
					<General {guildId} />
				{:else if section === 'modules'}
					<Modules {guildId} />
				{:else if section === 'logging'}
					<Logging {guildId} />
				{:else if section === 'welcome'}
					<Welcome {guildId} />
				{:else if section === 'verification'}
					<Verification {guildId} />
				{:else if section === 'automod'}
					<Automod {guildId} />
				{:else if section === 'moderation'}
					<Moderation {guildId} />
				{:else if section === 'reaction-roles'}
					<ReactionRoles {guildId} />
				{:else if section === 'messages'}
					<Messages {guildId} />
				{/if}
			</div>
		</main>
	</div>
{/if}
