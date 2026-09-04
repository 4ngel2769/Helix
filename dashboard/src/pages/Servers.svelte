<script lang="ts">
	import { onMount } from 'svelte';
	import { api, inviteUrl } from '../lib/api';
	import { session } from '../lib/session.svelte';
	import { go, guildIcon, formatCount } from '../lib/utils';
	import type { GuildListEntry } from '../lib/types';
	import PageHeader from '../components/PageHeader.svelte';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let guilds = $state<GuildListEntry[]>([]);
	let inviting = $state<string | null>(null);

	const params = new URLSearchParams(window.location.search);
	const oauthError = params.get('error');

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ guilds: GuildListEntry[] }>('/me/guilds');
			guilds = data.guilds.filter((g) => g.canManage);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load servers';
		} finally {
			loading = false;
		}
	}

	async function addBot(guildId?: string): Promise<void> {
		inviting = guildId ?? 'x';
		try {
			window.open(await inviteUrl(guildId), '_blank', 'noopener');
		} finally {
			inviting = null;
		}
	}

	const withBot = $derived(guilds.filter((g) => g.hasBot));
	const withoutBot = $derived(guilds.filter((g) => !g.hasBot));

	onMount(() => {
		if (session.user) void load();
	});
</script>

{#if !session.user}
	<div class="login-wrap">
		<div class="login-card">
			<span class="brand-mark" style="width: 44px; height: 44px; font-size: 24px;">H</span>
			<h1>Helix Dashboard</h1>
			<p class="muted">Manage your Discord servers, modules and moderation in one sharp, minimal place.</p>
			{#if oauthError}
				<div class="notice notice-error" style="margin-top: 16px; text-align: left;">
					Discord login failed ({oauthError}). Please try again.
				</div>
			{/if}
			<a class="btn discord-btn" href="/api/auth/login">Log in with Discord</a>
			<p class="small muted" style="margin-top: 14px;">We only request <span class="mono">identify</span> + <span class="mono">guilds</span> scopes.</p>
		</div>
	</div>
{:else if loading}
	<div class="page"><p class="loading">Loading your servers…</p></div>
{:else if error}
	<div class="page">
		<PageHeader title="Servers" />
		<div class="notice notice-error">{error}</div>
		<button class="btn btn-ghost" onclick={() => void load()}>Retry</button>
	</div>
{:else}
	<div class="page">
		<PageHeader title="Servers" description="Servers you can manage. Add Helix where it's missing, open settings where it's already in.">
			<button class="btn btn-ghost btn-sm" onclick={() => void addBot(undefined)} disabled={inviting !== null}>
				{inviting ? 'Opening…' : '+ Add to a server'}
			</button>
		</PageHeader>

		<div class="section-title">With Helix ({withBot.length})</div>
		{#if withBot.length === 0}
			<div class="empty">Helix isn't in any of your servers yet — add it below.</div>
		{:else}
			<div class="server-grid">
				{#each withBot as guild (guild.id)}
					<div class="server-card">
						<img src={guildIcon(guild.icon, guild.name)} alt="" />
						<div>
							<div class="s-name">{guild.name}</div>
							<div class="s-meta">
								{#if guild.approximate_member_count}{formatCount(guild.approximate_member_count)} members · {/if}Ready
							</div>
						</div>
						<div class="s-actions">
							<a class="btn btn-primary btn-sm" href={`/panel/guilds/${guild.id}/dashboard`} onclick={go(`/panel/guilds/${guild.id}/dashboard`)}>Manage</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="section-title">Add Helix ({withoutBot.length})</div>
		{#if withoutBot.length === 0}
			<div class="empty">Nothing to add — Helix is everywhere you manage.</div>
		{:else}
			<div class="server-grid">
				{#each withoutBot as guild (guild.id)}
					<div class="server-card">
						<img class="grey" src={guildIcon(guild.icon, guild.name)} alt="" />
						<div>
							<div class="s-name">{guild.name}</div>
							<div class="s-meta">Not installed</div>
						</div>
						<div class="s-actions">
							<button class="btn btn-ghost btn-sm" disabled={inviting === guild.id} onclick={() => void addBot(guild.id)}>
								{inviting === guild.id ? 'Opening…' : 'Add'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
