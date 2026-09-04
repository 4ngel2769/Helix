<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import Select from '../../components/Select.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	let welcomeChannelId = $state('');
	let welcomeMessage = $state('');
	let farewellChannelId = $state('');
	let farewellMessage = $state('');
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const str = (v: unknown): string => (typeof v === 'string' ? v : '');

	function syncFromCache(): void {
		welcomeChannelId = str(entry.config?.welcomeChannelId);
		welcomeMessage = str(entry.config?.welcomeMessage);
		farewellChannelId = str(entry.config?.farewellChannelId);
		farewellMessage = str(entry.config?.farewellMessage);
		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ welcomeChannelId, welcomeMessage, farewellChannelId, farewellMessage });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const nil = (v: string): string | null => (v === '' ? null : v);
			await saveGuildConfig(guildId, {
				welcomeChannelId: nil(welcomeChannelId),
				welcomeMessage: nil(welcomeMessage),
				farewellChannelId: nil(farewellChannelId),
				farewellMessage: nil(farewellMessage)
			});
			baseline = snapshot();
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="Welcome" description="Greet arrivals and say goodbye to leavers. Empty channel disables the message." />

<div class="card">
	<div class="card-title"><h2>Welcome</h2></div>
	<Select label="Welcome channel" bind:value={welcomeChannelId} options={channelOptions} />
	<TextArea label="Welcome message" bind:value={welcomeMessage} hint={'Supports {user}, {server}, {memberCount} placeholders.'} />
</div>

<div class="card">
	<div class="card-title"><h2>Farewell</h2></div>
	<Select label="Farewell channel" bind:value={farewellChannelId} options={channelOptions} />
	<TextArea label="Farewell message" bind:value={farewellMessage} hint={'Supports {user} and {server} placeholders.'} />
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
