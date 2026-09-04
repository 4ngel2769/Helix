<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../lib/api';
	import { session } from '../lib/session.svelte';
	import { formatCount, go } from '../lib/utils';
	import type { AuctionEntry, LeaderboardEntry, ShopItem } from '../lib/types';
	import PageHeader from '../components/PageHeader.svelte';
	import Select from '../components/Select.svelte';
	import TextInput from '../components/TextInput.svelte';

	let lbType = $state('total');
	let leaderboard = $state<LeaderboardEntry[]>([]);
	let lbLoading = $state(false);
	let lbError = $state<string | null>(null);

	let query = $state('');
	let items = $state<ShopItem[]>([]);
	let itemTotal = $state(0);
	let itemLoading = $state(false);
	let itemError = $state<string | null>(null);

	let auctions = $state<AuctionEntry[]>([]);
	let auctionTotal = $state(0);
	let auctionLoading = $state(false);
	let auctionError = $state<string | null>(null);

	async function loadLeaderboard(): Promise<void> {
		lbLoading = true;
		lbError = null;
		try {
			const data = await api<{ entries: LeaderboardEntry[] }>('/economy/leaderboard', { query: { type: lbType, limit: 25 } });
			leaderboard = data.entries;
		} catch (e) {
			lbError = e instanceof Error ? e.message : 'Failed to load leaderboard';
		} finally {
			lbLoading = false;
		}
	}

	async function searchItems(): Promise<void> {
		itemLoading = true;
		itemError = null;
		try {
			const data = await api<{ total: number; items: ShopItem[] }>('/economy/items', {
				query: { search: query.trim() || undefined, limit: 25, shopOnly: false }
			});
			items = data.items;
			itemTotal = data.total;
		} catch (e) {
			itemError = e instanceof Error ? e.message : 'Failed to search items';
		} finally {
			itemLoading = false;
		}
	}

	async function loadAuctions(): Promise<void> {
		auctionLoading = true;
		auctionError = null;
		try {
			const data = await api<{ total: number; auctions: AuctionEntry[] }>('/auctions', { query: { status: 'active', limit: 25 } });
			auctions = data.auctions;
			auctionTotal = data.total;
		} catch (e) {
			auctionError = e instanceof Error ? e.message : 'Failed to load auctions';
		} finally {
			auctionLoading = false;
		}
	}

	onMount(() => {
		if (!session.user) return;
		void loadLeaderboard();
		void searchItems();
		void loadAuctions();
	});
</script>

{#if !session.user}
	<div class="page">
		<div class="empty">
			<h2>Log in required</h2>
			<p><a href="/api/auth/login">Log in with Discord</a> to browse the economy.</p>
		</div>
	</div>
{:else}
	<div class="page">
		<PageHeader title="Economy" description="Leaderboard, shop catalog and auction house. Read-only — balances change only inside Discord.">
			<a class="btn btn-ghost btn-sm" href="/panel/me" onclick={go('/panel/me')}>My balance</a>
		</PageHeader>

		<div class="card">
			<div class="card-title"><h2>Leaderboard</h2></div>
			<div style="max-width: 280px;">
				<Select
					label="Ranked by"
					value={lbType}
					options={[
						{ value: 'total', label: 'Total wealth' },
						{ value: 'wallet', label: 'Wallet' },
						{ value: 'bank', label: 'Bank' },
						{ value: 'level', label: 'Level' }
					]}
					allowNone={false}
					onchange={(v) => {
						lbType = v;
						void loadLeaderboard();
					}}
				/>
			</div>
			{#if lbLoading}
				<p class="loading">Loading leaderboard…</p>
			{:else if lbError}
				<div class="notice notice-error">{lbError}</div>
			{:else if leaderboard.length === 0}
				<div class="empty">No entries yet.</div>
			{:else}
				<table class="table">
					<thead><tr><th>#</th><th>User</th><th>Total</th><th>Level</th></tr></thead>
					<tbody>
						{#each leaderboard as e (e.userId)}
							<tr>
								<td class="mono">{e.rank}</td>
								<td>{e.username ?? e.userId}</td>
								<td>{formatCount(e.total)}</td>
								<td>{e.level}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<div class="card">
			<div class="card-title"><h2>Shop catalog</h2><span class="tag">{itemTotal} items</span></div>
			<div style="display: flex; gap: 10px; align-items: flex-end; max-width: 560px;">
				<div style="flex: 1;"><TextInput label="Search" bind:value={query} placeholder="Sword, potion…" /></div>
				<button class="btn btn-ghost btn-sm" style="margin-bottom: 16px;" onclick={() => void searchItems()}>Search</button>
			</div>
			{#if itemLoading}
				<p class="loading">Searching…</p>
			{:else if itemError}
				<div class="notice notice-error">{itemError}</div>
			{:else if items.length === 0}
				<div class="empty">No items found.</div>
			{:else}
				<table class="table">
					<thead><tr><th>Item</th><th>Rarity</th><th>Price</th></tr></thead>
					<tbody>
						{#each items as item (item.itemId)}
							<tr>
								<td><strong>{item.name}</strong><br /><span class="small muted">{item.description ?? ''}</span></td>
								<td class="small">{item.rarity ?? '—'}</td>
								<td class="mono">{item.shop?.price ?? item.basePrice ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<div class="card">
			<div class="card-title"><h2>Active auctions</h2><span class="tag">{auctionTotal} live</span></div>
			{#if auctionLoading}
				<p class="loading">Loading auctions…</p>
			{:else if auctionError}
				<div class="notice notice-error">{auctionError}</div>
			{:else if auctions.length === 0}
				<div class="empty">No live auctions.</div>
			{:else}
				<table class="table">
					<thead><tr><th>Item</th><th>Bid</th><th>Ends</th></tr></thead>
					<tbody>
						{#each auctions as a (a.auctionId)}
							<tr>
								<td>{a.itemName ?? a.itemId ?? a.auctionId}</td>
								<td class="mono">{a.currentBid ?? a.startingBid ?? '—'}</td>
								<td class="small muted">{a.endTime ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
{/if}
