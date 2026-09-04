<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../lib/api';
	import { session } from '../lib/session.svelte';
	import { formatCount } from '../lib/utils';
	import type { MeData } from '../lib/types';
	import PageHeader from '../components/PageHeader.svelte';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<MeData | null>(null);

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			data = await api<MeData>('/me/data');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load your data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (session.user) void load();
	});
</script>

{#if !session.user}
	<div class="page">
		<div class="empty">
			<h2>Log in required</h2>
			<p><a href="/api/auth/login">Log in with Discord</a> to see your data.</p>
		</div>
	</div>
{:else}
	<div class="page">
		<PageHeader title="My data" description="Everything Helix stores about you. Read-only — nothing here can change bot state." />

		{#if loading}
			<p class="loading">Loading your data…</p>
		{:else if error}
			<div class="notice notice-error">{error}</div>
			<button class="btn btn-ghost" onclick={() => void load()}>Retry</button>
		{:else if data}
			<div class="stat-grid">
				<div class="stat"><div class="value">{formatCount(data.economy?.total ?? 0)}</div><div class="label">Coins (total)</div></div>
				<div class="stat"><div class="value">{data.economy?.level ?? '—'}</div><div class="label">Level</div></div>
				<div class="stat"><div class="value">{data.activeWarnings}</div><div class="label">Active warnings</div></div>
				<div class="stat"><div class="value">{data.economy?.inventoryTotal ?? 0}</div><div class="label">Items</div></div>
			</div>

			{#if !data.hasData}
				<div class="empty" style="margin-top: 16px;">Helix has no stored data for you yet — use the bot in a server first.</div>
			{:else}
				<div class="grid-2" style="margin-top: 16px;">
					<div class="card">
						<div class="card-title"><h2>Economy</h2></div>
						<table class="table">
							<tbody>
								<tr><td class="muted">Wallet</td><td>{formatCount(data.economy!.wallet)}</td></tr>
								<tr><td class="muted">Bank</td><td>{formatCount(data.economy!.bank)} / {formatCount(data.economy!.bankLimit)}</td></tr>
								<tr><td class="muted">Experience</td><td>{formatCount(data.economy!.experience)}</td></tr>
								<tr><td class="muted">Daily streak</td><td>{data.economy!.dailyStreak}</td></tr>
								<tr><td class="muted">Public profile</td><td>{data.economy!.publicProfile ? 'Yes' : 'No'}</td></tr>
								<tr><td class="muted">Achievements</td><td>{data.economy!.achievements.length > 0 ? data.economy!.achievements.join(', ') : 'None yet'}</td></tr>
							</tbody>
						</table>
					</div>
					<div class="card">
						<div class="card-title"><h2>Warnings</h2><span class="tag">{data.warnings.length} total</span></div>
						{#if data.warnings.length === 0}
							<p class="muted small">No warnings on record. Clean slate.</p>
						{:else}
							<table class="table">
								<thead><tr><th>Server</th><th>Reason</th><th>Status</th></tr></thead>
								<tbody>
									{#each data.warnings as w (`${w.guildId}-${w.timestamp}`)}
										<tr>
											<td class="small">{w.guildName ?? w.guildId}</td>
											<td class="small">{w.reason}</td>
											<td>{#if w.active}<span class="tag tag-on">active</span>{:else}<span class="tag">cleared</span>{/if}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</div>

				<div class="card">
					<div class="card-title"><h2>Stored about you</h2></div>
					<p class="card-desc">Helix keeps your Discord id, username, economy progress, inventory, warnings, and the servers it has seen you in ({data.servers.known.length}). It never sees your password, email, or DMs. Server managers can only see your warnings in servers they manage — never your wallet or inventory unless your profile is public.</p>
				</div>
			{/if}
		{/if}
	</div>
{/if}
