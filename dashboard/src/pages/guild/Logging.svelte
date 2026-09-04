<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import Select from '../../components/Select.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	const FIELDS = [
		{ key: 'modLogChannelId', label: 'Moderation log', hint: 'Kicks, bans, timeouts and warn actions.' },
		{ key: 'memberLogChannelId', label: 'Member log', hint: 'Joins and leaves.' },
		{ key: 'messageEditLogChannelId', label: 'Message edit log', hint: 'Edited messages.' },
		{ key: 'messageDeleteLogChannelId', label: 'Message delete log', hint: 'Deleted messages.' },
		{ key: 'nicknameLogChannelId', label: 'Nickname log', hint: 'Nickname changes.' },
		{ key: 'roleLogChannelId', label: 'Role log', hint: 'Role assignments.' },
		{ key: 'systemChannelId', label: 'System channel', hint: 'General bot notices.' }
	] as const;

	let values = $state<Record<string, string>>({
		modLogChannelId: '',
		memberLogChannelId: '',
		messageEditLogChannelId: '',
		messageDeleteLogChannelId: '',
		nicknameLogChannelId: '',
		roleLogChannelId: '',
		systemChannelId: ''
	});
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	function syncFromCache(): void {
		const next: Record<string, string> = {};
		for (const f of FIELDS) {
			const v = entry.config?.[f.key];
			next[f.key] = typeof v === 'string' ? v : '';
		}
		values = next;
		baseline = JSON.stringify(next);
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && JSON.stringify(values) !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const patch: Record<string, string | null> = {};
			for (const f of FIELDS) patch[f.key] = values[f.key] === '' ? null : values[f.key];
			await saveGuildConfig(guildId, patch);
			baseline = JSON.stringify(values);
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="Logging" description="Where the bot posts audit logs. Leave a channel empty to disable that log." />

<div class="card">
	<div class="grid-2">
		{#each FIELDS as f (f.key)}
			<Select label={f.label} value={values[f.key] ?? ''} options={channelOptions} hint={f.hint} onchange={(v) => { values[f.key] = v; saved = false; }} />
		{/each}
	</div>
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
