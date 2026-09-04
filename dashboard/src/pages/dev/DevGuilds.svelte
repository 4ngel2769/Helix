<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import { session } from '../../lib/session.svelte';
	import { formatCount } from '../../lib/utils';
	import type { DevGuildEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let guilds = $state<DevGuildEntry[]>([]);

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ guilds: DevGuildEntry[] }>('/dev/guilds');
			guilds = data.guilds;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load bot guilds';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (session.user && session.isDeveloper) void load();
	});
</script>

<div class="page">
	<PageHeader title="Bot servers" description="Every server Helix is in, with owners. Developer-only." />

	{#if !session.isDeveloper}
		<div class="notice notice-error">Bot developer access required.</div>
	{:else if loading}
		<p class="loading">Loading servers…</p>
	{:else if error}
		<div class="notice notice-error">{error}</div>
		<button class="btn btn-ghost" onclick={() => void load()}>Retry</button>
	{:else}
		<div class="card">
			<table class="table">
				<thead><tr><th>Server</th><th>Members</th><th>Owner</th><th>Joined</th></tr></thead>
				<tbody>
					{#each guilds as g (g.id)}
						<tr>
							<td><strong>{g.name}</strong><br /><span class="small muted mono">{g.id}</span></td>
							<td>{formatCount(g.memberCount)}</td>
							<td class="small">{g.ownerUsername ?? g.ownerId}<br /><span class="muted mono">{g.ownerId}</span></td>
							<td class="small muted">{g.joinedAt ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
