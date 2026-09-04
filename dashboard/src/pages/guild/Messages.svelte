<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import PageHeader from '../../components/PageHeader.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import TextArea from '../../components/TextArea.svelte';

	let { guildId }: { guildId: string } = $props();

	let messages = $state<Record<string, string>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	let key = $state('');
	let text = $state('');
	let busy = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ messages: Record<string, string> }>(`/guilds/${guildId}/messages`);
			messages = data.messages ?? {};
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	function edit(k: string): void {
		key = k;
		text = messages[k] ?? '';
	}

	async function save(): Promise<void> {
		if (!key.trim() || !text) return;
		busy = true;
		error = null;
		notice = null;
		try {
			const data = await api<{ messages: Record<string, string> }>(`/guilds/${guildId}/messages`, {
				method: 'PATCH',
				body: { messages: { [key.trim()]: text } }
			});
			messages = data.messages ?? {};
			notice = `Message "${key.trim()}" saved.`;
			key = '';
			text = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			busy = false;
		}
	}

	onMount(() => void load());
</script>

<PageHeader title="Messages" description="Custom per-server texts the bot can use (command replies, announcements). Keys are free-form." />

<div class="notice notice-info">
	<strong>Placeholders you can use in any message:</strong>
	<code>&#123;&#123;user.mention&#125;&#125;</code>, <code>&#123;&#123;user.name&#125;&#125;</code>, <code>&#123;&#123;user.tag&#125;&#125;</code>,
	<code>&#123;&#123;prefix&#125;&#125;</code>, <code>&#123;&#123;server.name&#125;&#125;</code>, <code>&#123;&#123;server.members&#125;&#125;</code>.
</div>

{#if error}<div class="notice notice-error">{error}</div>{/if}
{#if notice}<div class="notice notice-ok">{notice}</div>{/if}

{#if loading}
	<p class="loading">Loading messages…</p>
{:else if Object.keys(messages).length === 0}
	<div class="empty">No custom messages yet.</div>
{:else}
	<div class="card">
		<table class="table">
			<thead><tr><th>Key</th><th>Text</th><th></th></tr></thead>
			<tbody>
				{#each Object.entries(messages) as [k, v] (k)}
					<tr>
						<td><span class="mono">{k}</span></td>
						<td class="small">{v.length > 120 ? `${v.slice(0, 120)}…` : v}</td>
						<td><button class="btn btn-ghost btn-sm" onclick={() => edit(k)}>Edit</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<div class="card">
	<div class="card-title"><h2>{key && messages[key] !== undefined ? 'Edit message' : 'New message'}</h2></div>
	<TextInput label="Key" bind:value={key} placeholder="welcome-dm" hint="Lowercase letters, numbers and dashes." />
	<TextArea label="Text" bind:value={text} hint="Max 2000 characters." rows={3} />
	<button class="btn btn-primary btn-sm" disabled={busy || !key.trim() || !text} onclick={() => void save()}>
		{busy ? 'Saving…' : 'Save message'}
	</button>
</div>
