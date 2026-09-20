<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import { session } from '../../lib/session.svelte';
	import { formatCount } from '../../lib/utils';
	import type { DevGuildEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import TextInput from '../../components/TextInput.svelte';

	const LIMIT = 20;
	const TABS = [
		{ key: 'all', label: 'All' },
		{ key: 'premium', label: 'Premium' },
		{ key: 'disabled', label: 'Disabled' },
		{ key: 'banned', label: 'Banned' },
		{ key: 'large', label: 'Large (1k+)' }
	];

	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let guilds = $state<DevGuildEntry[]>([]);
	let total = $state(0);
	let page = $state(1);
	let query = $state('');
	let tab = $state('all');
	let busyId = $state<string | null>(null);
	let expandedId = $state<string | null>(null);

	// Expanded-row editors
	let editMessage = $state('');
	let editReason = $state('');
	let aiContext = $state('');
	let premiumDays = $state(30);
	let drafting = $state(false);

	async function load(reset: boolean): Promise<void> {
		if (reset) {
			page = 1;
			guilds = [];
		}
		if (page === 1) loading = true;
		else loadingMore = true;
		error = null;
		try {
			const data = await api<{ total: number; page: number; guilds: DevGuildEntry[] }>('/dev/guilds', {
				query: { search: query.trim() || undefined, filter: tab, page, limit: LIMIT }
			});
			total = data.total;
			guilds = reset ? data.guilds : [...guilds, ...data.guilds];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load bot guilds';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	function onSearch(): void {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void load(true), 400);
	}

	function setTab(key: string): void {
		tab = key;
		void load(true);
	}

	function toggleExpand(g: DevGuildEntry): void {
		if (expandedId === g.id) {
			expandedId = null;
			return;
		}
		expandedId = g.id;
		editMessage = g.disabledMessage ?? '';
		editReason = g.banReason ?? '';
		aiContext = '';
		premiumDays = 30;
	}

	function shortDate(iso: string | null | undefined): string {
		if (!iso) return 'permanent';
		const t = new Date(iso).getTime();
		return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString();
	}

	function grantPremium(g: DevGuildEntry): void {
		const days = Math.max(1, Math.min(3650, Math.floor(Number(premiumDays) || 30)));
		void patch(g, { premiumDays: days }, null, `Premium granted for ${days} days to "{name}".`);
	}

	async function patch(g: DevGuildEntry, body: Record<string, unknown>, confirmText: string | null, okText: string): Promise<void> {
		if (confirmText && !window.confirm(`${confirmText} "${g.name}"?`)) return;
		busyId = g.id;
		error = null;
		notice = null;
		try {
			const data = await api<DevGuildEntry>('/dev/guilds', { method: 'PATCH', body: { guildId: g.id, ...body } });
			Object.assign(g, data);
			notice = okText.replace('{name}', g.name);
			if (typeof data.dmSent === 'boolean') notice += data.dmSent ? ' Owner notified by DM.' : ' (DM to owner failed — DMs closed?)';
			if (body.guildBanned === true) await load(true);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Update failed';
		} finally {
			busyId = null;
		}
	}

	async function leave(g: DevGuildEntry): Promise<void> {
		if (!window.confirm(`Make Helix leave "${g.name}"? (It can be re-added.)`)) return;
		busyId = g.id;
		try {
			await api('/dev/guilds', { method: 'POST', body: { guildId: g.id, action: 'leave' } });
			notice = `Left "${g.name}".`;
			await load(true);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Leave failed';
		} finally {
			busyId = null;
		}
	}

	async function reset(g: DevGuildEntry): Promise<void> {
		if (!window.confirm(`Wipe ALL settings of "${g.name}" back to defaults? The bot stays.`)) return;
		busyId = g.id;
		try {
			await api('/dev/guilds', { method: 'POST', body: { guildId: g.id, action: 'reset' } });
			notice = `"${g.name}" settings reset to defaults.`;
			await load(true);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Reset failed';
		} finally {
			busyId = null;
		}
	}

	async function draftReason(g: DevGuildEntry): Promise<void> {
		drafting = true;
		error = null;
		try {
			const data = await api<{ draft: string }>('/dev/ai-draft', {
				method: 'POST',
				body: { kind: 'guild', targetId: g.id, targetName: g.name, context: aiContext }
			});
			editReason = data.draft;
		} catch (e) {
			error = e instanceof Error ? e.message : 'AI draft failed';
		} finally {
			drafting = false;
		}
	}

	onMount(() => {
		if (session.user && session.isDeveloper) void load(true);
	});
</script>

<div class="page">
	<PageHeader title="Bot servers" description="Every server Helix is in. Developer-only." />

	{#if !session.isDeveloper}
		<div class="notice notice-error">Bot developer access required.</div>
	{:else}
		{#if notice}<div class="notice notice-ok">{notice}</div>{/if}
		{#if error}<div class="notice notice-error">{error}</div>{/if}
		<div class="card">
			<div class="field" style="max-width: 360px;">
				<label for="dev-guild-search">Search servers</label>
				<input id="dev-guild-search" type="search" placeholder="Name or server ID…" bind:value={query} oninput={onSearch} />
			</div>
			<div class="seg" style="max-width: 560px;">
				{#each TABS as t (t.key)}
					<button type="button" class={tab === t.key ? 'sel' : ''} onclick={() => setTab(t.key)}>{t.label}</button>
				{/each}
			</div>
			<div class="small muted" style="margin-bottom: 10px;">{total} server{total === 1 ? '' : 's'}</div>
			{#if loading}
				<p class="loading">Loading servers…</p>
			{:else if guilds.length === 0}
				<div class="empty">No servers match.</div>
			{:else}
				<table class="table">
					<thead><tr><th>Server</th><th>Members</th><th>Status</th><th></th></tr></thead>
					<tbody>
						{#each guilds as g (g.id)}
							<tr>
								<td>
									<button type="button" class="link" onclick={() => toggleExpand(g)}><strong>{g.name}</strong></button><br />
									<span class="small muted mono">{g.id}</span><br />
									<span class="small muted">{g.ownerUsername ?? g.ownerId}</span>
								</td>
								<td>{formatCount(g.memberCount)}</td>
								<td>
									{#if g.guildBanned}<span class="tag tag-off">banned</span>
									{:else if g.botDisabled}<span class="tag tag-warn">disabled</span>
									{:else if g.isPremium}<span class="tag tag-on">premium · {shortDate(g.premiumExpiresAt)}</span>
									{:else}<span class="tag">free</span>{/if}
								</td>
								<td>
									<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
										<a class="btn btn-ghost btn-sm" href={`/panel/guilds/${g.id}/overview`}>Open</a>
										<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { isPremium: !g.isPremium }, null, `"${'{name}'}" premium updated.`)}>
											{g.isPremium ? 'Drop premium' : 'Give premium'}
										</button>
										{#if g.botDisabled}
											<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { botDisabled: false }, 'Re-enable Helix in', 'Re-enabled "{name}".')}>Enable</button>
										{:else}
											<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { botDisabled: true }, 'Soft-disable Helix in (bot stays, commands reply with notice)', 'Disabled "{name}".')}>Disable</button>
										{/if}
										{#if g.guildBanned}
											<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { guildBanned: false }, 'Unban', 'Unbanned "{name}" — it can be re-added.')}>Unban</button>
										{:else}
											<button class="btn btn-danger btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { guildBanned: true }, 'BAN — Helix leaves immediately and refuses re-entry to', 'Banned "{name}" — the bot left.')}>Ban server</button>
										{/if}
										<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void leave(g)}>Leave</button>
										<button class="btn btn-ghost btn-sm" disabled={busyId === g.id} onclick={() => void reset(g)}>Reset</button>
									</div>
								</td>
							</tr>
							{#if expandedId === g.id}
								<tr>
									<td colspan={4}>
										<div class="grid-2">
											<div>
												<div class="small muted">Owner ID <span class="mono">{g.ownerId}</span> · Joined {g.joinedAt ?? '—'} · {g.channels} channels · {g.roles} roles</div>
												<div class="small" style="margin: 8px 0;">Premium: <strong>{g.isPremium ? `active till ${shortDate(g.premiumExpiresAt)}` : 'none'}</strong></div>
												<div style="display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 8px;">
													<div class="field" style="max-width: 110px; margin: 0;">
														<label for={`prem-days-${g.id}`}>Days</label>
														<input id={`prem-days-${g.id}`} type="number" min={1} max={3650} bind:value={premiumDays} />
													</div>
													<button class="btn btn-primary btn-sm" disabled={busyId === g.id} onclick={() => grantPremium(g)}>Grant timed</button>
												</div>
												<TextArea label="Disable notice (supports supportServer name / count / invite placeholders)" bind:value={editMessage} maxlength={500} rows={3} hint="Empty = default notice. Shown instead of command output while disabled." />
												<div style="display: flex; gap: 8px;">
													<button class="btn btn-primary btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { disabledMessage: editMessage.trim() === '' ? null : editMessage }, null, 'Disable notice saved for "{name}".')}>Save notice</button>
												</div>
											</div>
											<div>
												<TextArea label="Internal ban reason (never shown to the server)" bind:value={editReason} maxlength={1000} rows={3} />
												<TextInput label="AI context (optional)" bind:value={aiContext} maxlength={500} placeholder="spam botnet, 3 rejoins, owner unresponsive…" />
												<div style="display: flex; gap: 8px; flex-wrap: wrap;">
													<button class="btn btn-ghost btn-sm" disabled={drafting || busyId === g.id} onclick={() => void draftReason(g)}>{drafting ? 'Drafting…' : '✨ Draft with AI'}</button>
													<button class="btn btn-primary btn-sm" disabled={busyId === g.id} onclick={() => void patch(g, { banReason: editReason.trim() === '' ? null : editReason }, null, 'Ban reason saved for "{name}".')}>Save reason</button>
												</div>
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
				{#if guilds.length < total}
					<button class="btn btn-ghost btn-sm" disabled={loadingMore} onclick={() => { page += 1; void load(false); }} style="margin-top: 12px;">
						{loadingMore ? 'Loading…' : `Load more (${total - guilds.length} left)`}
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.seg {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}
	.seg button {
		border: 1px solid var(--border, #2a2d34);
		background: var(--bg-soft);
		color: inherit;
		border-radius: 8px;
		padding: 6px 12px;
		cursor: pointer;
		font-size: 13px;
	}
	.seg button.sel {
		border-color: var(--accent, #3b66ff);
	}
	.link {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 0;
		font-size: inherit;
		text-align: left;
	}
	.link:hover strong {
		text-decoration: underline;
	}
</style>
