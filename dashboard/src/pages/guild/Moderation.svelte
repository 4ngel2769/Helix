<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import type { WarningEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import Select from '../../components/Select.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	interface Threshold {
		count: number;
		action: 'kick' | 'ban' | 'timeout';
		duration?: number;
	}

	let thresholds = $state<Threshold[]>([]);
	let modChannelId = $state('');
	let baseline = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let saved = $state(false);

	let warnings = $state<WarningEntry[]>([]);
	let warnLoading = $state(true);
	let warnError = $state<string | null>(null);

	let newUserId = $state('');
	let newReason = $state('');
	let creating = $state(false);

	let actUserId = $state('');
	let actAction = $state('timeout');
	let actReason = $state('');
	let actDuration = $state('10');
	let acting = $state(false);
	let actMsg = $state<string | null>(null);
	let actErr = $state<string | null>(null);

	function syncFromCache(): void {
		const ws = (entry.config?.warnSettings ?? {}) as { thresholds?: Threshold[]; modChannelId?: string };
		thresholds = Array.isArray(ws.thresholds) ? ws.thresholds.map((t) => ({ ...t })) : [];
		modChannelId = typeof ws.modChannelId === 'string' ? ws.modChannelId : '';
		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ thresholds, modChannelId });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));

	async function save(): Promise<void> {
		saving = true;
		saveError = null;
		try {
			await saveGuildConfig(guildId, {
				warnSettings: { thresholds, modChannelId: modChannelId === '' ? null : modChannelId }
			});
			baseline = snapshot();
			saved = true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	function addThreshold(): void {
		saved = false;
		thresholds = [...thresholds, { count: (thresholds.length + 1) * 3, action: 'timeout', duration: 60 }];
	}

	function removeThreshold(index: number): void {
		saved = false;
		thresholds = thresholds.filter((_, i) => i !== index);
	}

	async function loadWarnings(): Promise<void> {
		warnLoading = true;
		warnError = null;
		try {
			const data = await api<{ warnings: WarningEntry[] }>(`/guilds/${guildId}/warnings`, { query: { activeOnly: false } });
			warnings = data.warnings;
		} catch (e) {
			warnError = e instanceof Error ? e.message : 'Failed to load warnings';
		} finally {
			warnLoading = false;
		}
	}

	async function createWarning(): Promise<void> {
		if (!newUserId.trim() || !newReason.trim()) return;
		creating = true;
		warnError = null;
		try {
			await api(`/guilds/${guildId}/warnings`, { method: 'POST', body: { userId: newUserId.trim(), reason: newReason.trim() } });
			newUserId = '';
			newReason = '';
			await loadWarnings();
		} catch (e) {
			warnError = e instanceof Error ? e.message : 'Failed to create warning';
		} finally {
			creating = false;
		}
	}

	async function clearWarning(w: WarningEntry): Promise<void> {
		if (!w._id) return;
		warnError = null;
		try {
			await api(`/guilds/${guildId}/warnings`, { method: 'DELETE', query: { userId: w.userId, warningId: w._id } });
			await loadWarnings();
		} catch (e) {
			warnError = e instanceof Error ? e.message : 'Failed to clear warning';
		}
	}

	async function moderate(): Promise<void> {
		if (!actUserId.trim()) return;
		if (!window.confirm(`${actAction} ${actUserId.trim()}?`)) return;
		acting = true;
		actMsg = null;
		actErr = null;
		try {
			await api(`/guilds/${guildId}/moderation`, {
				method: 'POST',
				body: {
					action: actAction,
					userId: actUserId.trim(),
					reason: actReason.trim() || undefined,
					durationMinutes: actAction === 'timeout' ? parseInt(actDuration, 10) || 10 : undefined
				}
			});
			actMsg = `Action ${actAction} completed.`;
			actUserId = '';
			actReason = '';
		} catch (e) {
			actErr = e instanceof Error ? e.message : 'Action failed';
		} finally {
			acting = false;
		}
	}

	onMount(() => void loadWarnings());
</script>

<PageHeader title="Moderation" description="Warn escalation, warning records and live moderation actions." />

<div class="card">
	<div class="card-title"><h2>Warn escalation</h2></div>
	<p class="card-desc">When a member reaches a warning count, the matching action fires automatically.</p>
	{#each thresholds as t, i (i)}
		<div class="row-flex" style="margin-bottom: 10px;">
			<div class="field" style="margin: 0;">
				<label for={`warn-count-${i}`}>Warns</label>
				<input id={`warn-count-${i}`} type="number" min="1" bind:value={thresholds[i]!.count} />
			</div>
			<div class="field" style="margin: 0;">
				<label for={`warn-action-${i}`}>Action</label>
				<select id={`warn-action-${i}`} bind:value={thresholds[i]!.action}>
					<option value="timeout">Timeout</option>
					<option value="kick">Kick</option>
					<option value="ban">Ban</option>
				</select>
			</div>
			<div class="field" style="margin: 0;">
				<label for={`warn-duration-${i}`}>Minutes</label>
				<input id={`warn-duration-${i}`} type="number" min="1" bind:value={thresholds[i]!.duration} disabled={t.action !== 'timeout'} />
			</div>
			<div style="flex: 0;">
				<button class="btn btn-danger btn-sm" onclick={() => removeThreshold(i)}>Remove</button>
			</div>
		</div>
	{/each}
	<button class="btn btn-ghost btn-sm" onclick={addThreshold}>+ Add threshold</button>
	<div style="margin-top: 14px; max-width: 560px;">
		<Select label="Moderation notices channel" bind:value={modChannelId} options={channelOptions} />
	</div>
</div>

<SaveBar {dirty} {saving} error={saveError} {saved} onsave={() => void save()} onreset={syncFromCache} />

<div class="card">
	<div class="card-title"><h2>Warnings</h2><button class="btn btn-ghost btn-sm" onclick={() => void loadWarnings()}>Refresh</button></div>
	{#if warnError}<div class="notice notice-error">{warnError}</div>{/if}
	{#if warnLoading}
		<p class="loading">Loading warnings…</p>
	{:else if warnings.length === 0}
		<div class="empty">No warnings recorded.</div>
	{:else}
		<table class="table">
			<thead><tr><th>User</th><th>Reason</th><th>By</th><th>Status</th><th></th></tr></thead>
			<tbody>
				{#each warnings as w (`${w.userId}-${w._id ?? w.timestamp}`)}
					<tr>
						<td><span class="mono">{w.username ?? w.userId}</span><br /><span class="small muted mono">{w.userId}</span></td>
						<td>{w.reason}</td>
						<td class="small muted">{w.moderatorTag ?? '—'}</td>
						<td>{#if w.active}<span class="tag tag-on">active</span>{:else}<span class="tag">cleared</span>{/if}</td>
						<td>{#if w.active}<button class="btn btn-ghost btn-sm" onclick={() => void clearWarning(w)}>Clear</button>{/if}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	<div class="grid-2" style="margin-top: 16px;">
		<TextInput label="User ID" bind:value={newUserId} placeholder="123456789…" />
		<TextInput label="Reason" bind:value={newReason} placeholder="Spamming links" />
	</div>
	<button class="btn btn-primary btn-sm" disabled={creating || !newUserId.trim() || !newReason.trim()} onclick={() => void createWarning()}>
		{creating ? 'Adding…' : 'Add warning'}
	</button>
</div>

<div class="card">
	<div class="card-title"><h2>Live action</h2></div>
	<p class="card-desc">Runs immediately against the live server. Use with care.</p>
	{#if actMsg}<div class="notice notice-ok">{actMsg}</div>{/if}
	{#if actErr}<div class="notice notice-error">{actErr}</div>{/if}
	<div class="grid-2">
		<TextInput label="User ID" bind:value={actUserId} />
		<div class="field">
			<label for="live-action">Action</label>
			<select id="live-action" bind:value={actAction}>
				<option value="timeout">Timeout</option>
				<option value="untimeout">Remove timeout</option>
				<option value="kick">Kick</option>
				<option value="ban">Ban</option>
				<option value="unban">Unban</option>
			</select>
		</div>
		<TextInput label="Reason" bind:value={actReason} />
		<TextInput label="Timeout minutes" bind:value={actDuration} type="number" />
	</div>
	<button class="btn btn-danger btn-sm" disabled={acting || !actUserId.trim()} onclick={() => void moderate()}>
		{acting ? 'Running…' : 'Run action'}
	</button>
</div>
