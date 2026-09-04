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

	const DEFAULT_WELCOME = 'Welcome {{user.mention}} to **{{server.name}}**! You are member #{{server.members}}.';
	const DEFAULT_FAREWELL = '**{{user.name}}** has left {{server.name}}.';

	function useDefaultWelcome(): void {
		saved = false;
		welcomeMessage = DEFAULT_WELCOME;
	}

	function useDefaultFarewell(): void {
		saved = false;
		farewellMessage = DEFAULT_FAREWELL;
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

<div class="notice notice-info">
	<strong>Placeholders you can use:</strong>
	<code>&#123;&#123;user.mention&#125;&#125;</code> pings the user, <code>&#123;&#123;user.name&#125;&#125;</code> is their display name,
	<code>&#123;&#123;user.tag&#125;&#125;</code> is their username, <code>&#123;&#123;prefix&#125;&#125;</code> is this server's prefix,
	<code>&#123;&#123;server.name&#125;&#125;</code> is the server name, <code>&#123;&#123;server.members&#125;&#125;</code> is the current member count.
	Leave the message empty to use the built-in default.
</div>

<div class="card">
	<div class="card-title"><h2>Welcome</h2><button class="btn btn-ghost btn-sm" onclick={useDefaultWelcome}>Use default</button></div>
	<Select label="Welcome channel" bind:value={welcomeChannelId} options={channelOptions} />
	<TextArea label="Welcome message" bind:value={welcomeMessage} hint="Supports user/prefix/server placeholders (see box above). Empty = default." />
</div>

<div class="card">
	<div class="card-title"><h2>Farewell</h2><button class="btn btn-ghost btn-sm" onclick={useDefaultFarewell}>Use default</button></div>
	<Select label="Farewell channel" bind:value={farewellChannelId} options={channelOptions} />
	<TextArea label="Farewell message" bind:value={farewellMessage} hint="Supports user/prefix/server placeholders (see box above). Empty = default." />
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
