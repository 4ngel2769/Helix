<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	const LISTS = [
		{ key: 'profanity', label: 'Profanity', hint: 'Swears and slurs, one per line.' },
		{ key: 'scams', label: 'Scams', hint: 'Crypto doublers, fake giveaways, one per line.' },
		{ key: 'phishing', label: 'Phishing', hint: 'Fake login / token-grabber patterns, one per line.' },
		{ key: 'custom', label: 'Custom', hint: 'Your own blocked words, one per line.' }
	] as const;

	let values = $state<Record<string, string>>({ profanity: '', scams: '', phishing: '', custom: '' });
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	function syncFromCache(): void {
		const kw = (entry.config?.automodKeywords ?? {}) as Record<string, string[]>;
		const next: Record<string, string> = {};
		for (const l of LISTS) {
			const arr = kw[l.key];
			next[l.key] = Array.isArray(arr) ? arr.join('\n') : '';
		}
		values = next;
		baseline = JSON.stringify(next);
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && JSON.stringify(values) !== baseline);

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const automodKeywords: Record<string, string[]> = {};
			for (const l of LISTS) {
				automodKeywords[l.key] = values[l.key].split('\n').map((s) => s.trim()).filter(Boolean);
			}
			await saveGuildConfig(guildId, { automodKeywords });
			baseline = JSON.stringify(values);
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="AutoMod" description="Blocked word lists. Matching is case-insensitive; keep entries specific to avoid false positives." />

<div class="card">
	<div class="grid-2">
		{#each LISTS as l (l.key)}
			<TextArea label={l.label} bind:value={values[l.key]} hint={l.hint} rows={6} />
		{/each}
	</div>
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
