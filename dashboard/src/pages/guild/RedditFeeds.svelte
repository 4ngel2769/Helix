<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import type { RedditFeed } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import Select from '../../components/Select.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Toggle from '../../components/Toggle.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	let feeds = $state<RedditFeed[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let busy = $state(false);

	let subreddit = $state('');
	let channelId = $state('');
	let interval = $state('60');

	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));
	function channelName(id: string): string {
		return entry.detail?.channels?.find((c) => c.id === id)?.name ?? id;
	}

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ feeds: RedditFeed[] }>(`/guilds/${guildId}/reddit-feeds`);
			feeds = data.feeds;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load feeds';
		} finally {
			loading = false;
		}
	}

	async function create(): Promise<void> {
		const sub = subreddit.trim().replace(/^r\//i, '');
		if (!sub || !channelId) return;
		busy = true;
		error = null;
		notice = null;
		try {
			await api(`/guilds/${guildId}/reddit-feeds`, {
				method: 'POST',
				body: { channelId, subreddit: sub, intervalMinutes: parseInt(interval, 10) || 60 }
			});
			notice = `Feed r/${sub} created.`;
			subreddit = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Create failed';
		} finally {
			busy = false;
		}
	}

	async function setActive(feed: RedditFeed, active: boolean): Promise<void> {
		error = null;
		notice = null;
		feed.active = active;
		try {
			await api(`/guilds/${guildId}/reddit-feeds`, { method: 'PATCH', body: { feedId: feed.feedId, active } });
			notice = `Feed r/${feed.subreddit} ${active ? 'resumed' : 'paused'}.`;
		} catch (e) {
			feed.active = !active;
			error = e instanceof Error ? e.message : 'Update failed';
		}
	}

	async function postNow(feed: RedditFeed): Promise<void> {
		busy = true;
		error = null;
		notice = null;
		try {
			await api(`/guilds/${guildId}/reddit-feeds`, { method: 'PATCH', body: { feedId: feed.feedId, postNow: true } });
			notice = `Posted a fresh pic from r/${feed.subreddit}.`;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Post failed';
		} finally {
			busy = false;
		}
	}

	async function remove(feed: RedditFeed): Promise<void> {
		if (!window.confirm(`Delete feed r/${feed.subreddit}?`)) return;
		error = null;
		try {
			await api(`/guilds/${guildId}/reddit-feeds`, { method: 'DELETE', query: { feedId: feed.feedId } });
			notice = 'Feed deleted.';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Delete failed';
		}
	}

	onMount(() => void load());
</script>

<PageHeader title="Reddit Feeds" description="Auto-post fresh pics from a subreddit to a channel on a timer. Only runs while the Fun module is on; NSFW posts are always skipped." />

{#if error}<div class="notice notice-error">{error}</div>{/if}
{#if notice}<div class="notice notice-ok">{notice}</div>{/if}

{#if loading}
	<p class="loading">Loading feeds…</p>
{:else if feeds.length === 0}
	<div class="empty">No feeds yet — create the first one below.</div>
{:else}
	<div class="card">
		{#each feeds as feed (feed.feedId)}
			<div class="toggle-row">
				<div style="flex: 1; min-width: 0;">
					<div class="t-title">r/{feed.subreddit} → #{channelName(feed.channelId)}</div>
					<div class="t-desc">
						Every {feed.intervalMinutes} min
						{#if feed.lastPostedAt}· last post {new Date(feed.lastPostedAt).toLocaleString()}{:else}· never posted{/if}
						{#if !feed.active}· <strong>paused</strong>{/if}
					</div>
					<div style="display: flex; gap: 6px; margin-top: 8px;">
						<button class="btn btn-ghost btn-sm" disabled={busy} onclick={() => void postNow(feed)}>Post now</button>
						<button class="btn btn-danger btn-sm" onclick={() => void remove(feed)}>Delete</button>
					</div>
				</div>
				<Toggle title="Active" checked={feed.active} onchange={(v) => void setActive(feed, v)} />
			</div>
		{/each}
	</div>
{/if}

<div class="card">
	<div class="card-title"><h2>New feed</h2><span class="tag">{feeds.length}/10</span></div>
	<div class="grid-2">
		<TextInput label="Subreddit" bind:value={subreddit} placeholder="cats" hint="Letters, numbers and underscores, 3–21 chars. The r/ prefix is optional." />
		<Select label="Channel" bind:value={channelId} options={channelOptions} allowNone={false} hint="The bot needs Send Messages + Embed Links here." />
		<TextInput label="Interval (minutes)" bind:value={interval} type="number" placeholder="60" hint="10–1440 minutes." />
	</div>
	<button class="btn btn-primary btn-sm" disabled={busy || !subreddit.trim() || !channelId || feeds.length >= 10} onclick={() => void create()}>
		{busy ? 'Saving…' : 'Create feed'}
	</button>
</div>
