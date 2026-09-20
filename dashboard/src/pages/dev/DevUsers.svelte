<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import { session } from '../../lib/session.svelte';
	import type { DevUserEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import TextInput from '../../components/TextInput.svelte';

	const LIMIT = 20;
	const TABS = [
		{ key: 'all', label: 'All' },
		{ key: 'premium', label: 'Premium' },
		{ key: 'banned', label: 'Banned' },
		{ key: 'warned', label: 'Warned' }
	];

	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let users = $state<DevUserEntry[]>([]);
	let total = $state(0);
	let page = $state(1);
	let query = $state('');
	let tab = $state('all');
	let busyId = $state<string | null>(null);
	let expandedId = $state<string | null>(null);

	let editReason = $state('');
	let aiContext = $state('');
	let premiumDays = $state(30);
	let drafting = $state(false);

	async function load(reset: boolean): Promise<void> {
		if (reset) {
			page = 1;
			users = [];
		}
		if (page === 1) loading = true;
		else loadingMore = true;
		error = null;
		try {
			const data = await api<{ total: number; page: number; users: DevUserEntry[] }>('/dev/users', {
				query: { search: query.trim() || undefined, filter: tab, page, limit: LIMIT }
			});
			total = data.total;
			users = reset ? data.users : [...users, ...data.users];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load users';
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

	function toggleExpand(u: DevUserEntry): void {
		if (expandedId === u.userId) {
			expandedId = null;
			return;
		}
		expandedId = u.userId;
		editReason = u.banReason ?? '';
		aiContext = '';
		premiumDays = 30;
	}

	function shortDate(iso: string | null | undefined): string {
		if (!iso) return 'permanent';
		const t = new Date(iso).getTime();
		return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString();
	}

	function grantPremium(u: DevUserEntry): void {
		const days = Math.max(1, Math.min(3650, Math.floor(Number(premiumDays) || 30)));
		void patch(u, { premiumDays: days }, null, `Premium granted for ${days} days.`);
	}

	async function patch(u: DevUserEntry, body: Record<string, unknown>, confirmText: string | null, okText: string): Promise<void> {
		if (confirmText && !window.confirm(`${confirmText} "${u.username ?? u.userId}"?`)) return;
		busyId = u.userId;
		error = null;
		notice = null;
		try {
			const data = await api<{ isPremium: boolean; premiumExpiresAt: string | null; botBanned: boolean; banReason: string | null; resetEconomy: boolean }>('/dev/users', {
				method: 'PATCH',
				body: { userId: u.userId, ...body }
			});
			u.isPremium = data.isPremium;
			u.premiumExpiresAt = data.premiumExpiresAt;
			u.botBanned = data.botBanned;
			u.banReason = data.banReason;
			if (data.resetEconomy) {
				u.wallet = 1000;
				u.bank = 0;
				u.level = 1;
			}
			notice = okText;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Update failed';
		} finally {
			busyId = null;
		}
	}

	async function draftReason(u: DevUserEntry): Promise<void> {
		drafting = true;
		error = null;
		try {
			const data = await api<{ draft: string }>('/dev/ai-draft', {
				method: 'POST',
				body: { kind: 'user', targetId: u.userId, targetName: u.username ?? u.userId, context: aiContext }
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
	<PageHeader title="Bot users" description="Everyone with a Helix profile. Developer-only." />

	{#if !session.isDeveloper}
		<div class="notice notice-error">Bot developer access required.</div>
	{:else}
		{#if notice}<div class="notice notice-ok">{notice}</div>{/if}
		{#if error}<div class="notice notice-error">{error}</div>{/if}
		<div class="card">
			<div class="field" style="max-width: 360px;">
				<label for="dev-user-search">Search users</label>
				<input id="dev-user-search" type="search" placeholder="Username or user ID…" bind:value={query} oninput={onSearch} />
			</div>
			<div class="seg" style="max-width: 480px;">
				{#each TABS as t (t.key)}
					<button type="button" class={tab === t.key ? 'sel' : ''} onclick={() => setTab(t.key)}>{t.label}</button>
				{/each}
			</div>
			<div class="small muted" style="margin-bottom: 10px;">{total} user{total === 1 ? '' : 's'}</div>
			{#if loading}
				<p class="loading">Loading users…</p>
			{:else if users.length === 0}
				<div class="empty">No users match.</div>
			{:else}
				<table class="table">
					<thead><tr><th>User</th><th>Wallet / Bank</th><th>Lvl</th><th>Warns</th><th>Status</th><th></th></tr></thead>
					<tbody>
						{#each users as u (u.userId)}
							<tr>
								<td>
									<button type="button" class="link" onclick={() => toggleExpand(u)}><strong>{u.username ?? '?'}</strong></button><br />
									<span class="small muted mono">{u.userId}</span>
								</td>
								<td class="small mono">{u.wallet.toLocaleString('en-US')} / {u.bank.toLocaleString('en-US')}</td>
								<td>{u.level}</td>
								<td>{u.activeWarnings > 0 ? u.activeWarnings : '—'}</td>
								<td>
									{#if u.botBanned}<span class="tag tag-off">banned</span>
									{:else if u.isPremium}<span class="tag tag-on">premium · {shortDate(u.premiumExpiresAt)}</span>
									{:else}<span class="tag">free</span>{/if}
								</td>
								<td>
									<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
										<button class="btn btn-ghost btn-sm" disabled={busyId === u.userId} onclick={() => void patch(u, { isPremium: !u.isPremium }, null, 'Premium flag updated.')}>
											{u.isPremium ? 'Drop premium' : 'Give premium'}
										</button>
										{#if u.botBanned}
											<button class="btn btn-ghost btn-sm" disabled={busyId === u.userId} onclick={() => void patch(u, { botBanned: false }, 'Unban', 'User unbanned.')}>Unban</button>
										{:else}
											<button class="btn btn-danger btn-sm" disabled={busyId === u.userId} onclick={() => void patch(u, { botBanned: true }, 'Ban from using Helix', 'User banned from Helix.')}>Ban</button>
										{/if}
										<button class="btn btn-ghost btn-sm" disabled={busyId === u.userId} onclick={() => void patch(u, { resetEconomy: true }, 'Reset economy of', 'Economy reset to new-player defaults.')}>Reset economy</button>
									</div>
								</td>
							</tr>
							{#if expandedId === u.userId}
								<tr>
									<td colspan={6}>
										<div class="small muted" style="margin-bottom: 8px;">Last seen {u.lastSeen ?? '—'}</div>
										<div class="small" style="margin-bottom: 8px;">Premium: <strong>{u.isPremium ? `active till ${shortDate(u.premiumExpiresAt)}` : 'none'}</strong></div>
										<div style="display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 8px;">
											<div class="field" style="max-width: 110px; margin: 0;">
												<label for={`uprem-days-${u.userId}`}>Days</label>
												<input id={`uprem-days-${u.userId}`} type="number" min={1} max={3650} bind:value={premiumDays} />
											</div>
											<button class="btn btn-primary btn-sm" disabled={busyId === u.userId} onclick={() => grantPremium(u)}>Grant timed</button>
										</div>
										<TextArea label="Internal ban reason (never shown to the user)" bind:value={editReason} maxlength={1000} rows={3} />
										<TextInput label="AI context (optional)" bind:value={aiContext} maxlength={500} placeholder="economy exploit, alt of banned user, chargeback…" />
										<div style="display: flex; gap: 8px; flex-wrap: wrap;">
											<button class="btn btn-ghost btn-sm" disabled={drafting || busyId === u.userId} onclick={() => void draftReason(u)}>{drafting ? 'Drafting…' : '✨ Draft with AI'}</button>
											<button class="btn btn-primary btn-sm" disabled={busyId === u.userId} onclick={() => void patch(u, { banReason: editReason.trim() === '' ? null : editReason }, null, 'Ban reason saved.')}>Save reason</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
				{#if users.length < total}
					<button class="btn btn-ghost btn-sm" disabled={loadingMore} onclick={() => { page += 1; void load(false); }} style="margin-top: 12px;">
						{loadingMore ? 'Loading…' : `Load more (${total - users.length} left)`}
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
