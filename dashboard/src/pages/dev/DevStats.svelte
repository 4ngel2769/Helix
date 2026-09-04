<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import { session } from '../../lib/session.svelte';
	import { formatCount, go } from '../../lib/utils';
	import type { DevStats } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let stats = $state<DevStats | null>(null);

	function uptime(ms: number): string {
		const s = Math.floor(ms / 1000);
		const d = Math.floor(s / 86400);
		const h = Math.floor((s % 86400) / 3600);
		const m = Math.floor((s % 3600) / 60);
		return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
	}

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			stats = await api<DevStats>('/dev/stats');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load stats';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (session.user && session.isDeveloper) void load();
	});
</script>

<div class="page">
	<PageHeader title="Bot stats" description="Internals and database totals. Developer-only.">
		<a class="btn btn-ghost btn-sm" href="/panel/me" onclick={go('/panel/me')}>My private data</a>
	</PageHeader>

	{#if !session.isDeveloper}
		<div class="notice notice-error">Bot developer access required.</div>
	{:else if loading}
		<p class="loading">Loading stats…</p>
	{:else if error}
		<div class="notice notice-error">{error}</div>
		<button class="btn btn-ghost" onclick={() => void load()}>Retry</button>
	{:else if stats}
		<div class="stat-grid">
			<div class="stat"><div class="value">{formatCount(stats.discord.guilds)}</div><div class="label">Servers</div></div>
			<div class="stat"><div class="value">{formatCount(stats.discord.users)}</div><div class="label">Cached users</div></div>
			<div class="stat"><div class="value">{stats.commands}</div><div class="label">Commands</div></div>
			<div class="stat"><div class="value">{uptime(stats.uptimeMs)}</div><div class="label">Uptime</div></div>
		</div>

		<div class="grid-2" style="margin-top: 16px;">
			<div class="card">
				<div class="card-title"><h2>Database</h2></div>
				<table class="table">
					<tbody>
						<tr><td class="muted">Users</td><td>{formatCount(stats.database.users)}</td></tr>
						<tr><td class="muted">Guild configs</td><td>{formatCount(stats.database.guildDocs)}</td></tr>
						<tr><td class="muted">Active auctions</td><td>{formatCount(stats.database.activeAuctions)}</td></tr>
						<tr><td class="muted">Shop items</td><td>{formatCount(stats.database.items)}</td></tr>
					</tbody>
				</table>
			</div>
			<div class="card">
				<div class="card-title"><h2>Process</h2></div>
				<table class="table">
					<tbody>
						<tr><td class="muted">Version</td><td><span class="mono">{stats.version}</span></td></tr>
						<tr><td class="muted">Bot</td><td class="small">{stats.bot.username} <span class="muted mono">{stats.bot.id}</span></td></tr>
						<tr><td class="muted">Modules</td><td>{stats.modules}</td></tr>
						<tr><td class="muted">Heap</td><td>{stats.memory.heapUsedMb} / {stats.memory.heapTotalMb} MB</td></tr>
						<tr><td class="muted">RSS</td><td>{stats.memory.rssMb} MB</td></tr>
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
