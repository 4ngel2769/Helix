<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import SearchPicker from '../../components/SearchPicker.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import DiscordPreview from '../../components/DiscordPreview.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	let channelId = $state('');
	let roleId = $state('');
	let title = $state('');
	let message = $state('');
	let disabledMessage = $state('');
	let footer = $state('');
	let thumb = $state('');
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const str = (v: unknown): string => (typeof v === 'string' ? v : '');

	function syncFromCache(): void {
		channelId = str(entry.config?.verificationChannelId);
		roleId = str(entry.config?.verificationRoleId);
		title = str(entry.config?.verificationTitle);
		message = str(entry.config?.verificationMessage);
		disabledMessage = str(entry.config?.verificationDisabledMessage);
		footer = str(entry.config?.verificationFooter);
		thumb = str(entry.config?.verificationThumb);
		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ channelId, roleId, title, message, disabledMessage, footer, thumb });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}`, kind: 'channel' as const })));
	const roleOptions = $derived((entry.detail?.roles ?? []).map((r) => ({ value: r.id, label: `@${r.name}`, color: r.color, kind: 'role' as const })));

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const nil = (v: string): string | null => (v === '' ? null : v);
			await saveGuildConfig(guildId, {
				verificationChannelId: nil(channelId),
				verificationRoleId: nil(roleId),
				verificationTitle: nil(title),
				verificationMessage: nil(message),
				verificationDisabledMessage: nil(disabledMessage),
				verificationFooter: nil(footer),
				verificationThumb: nil(thumb)
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

<PageHeader title="Verification" description="Gate new members behind a verify step. No channel = verification off." />

<div class="card">
	<div class="grid-2">
		<SearchPicker label="Verification channel" bind:value={channelId} options={channelOptions} hint="Where the verify prompt is posted." />
		<SearchPicker label="Verified role" bind:value={roleId} options={roleOptions} hint="Granted after verifying." />
	</div>
	<TextInput label="Title" bind:value={title} maxlength={256} />
	<TextArea label="Message" bind:value={message} maxlength={2000} hint="Supports the same user/prefix/server placeholders as Welcome messages." />
	<TextArea label="Disabled message" bind:value={disabledMessage} maxlength={1000} hint="Shown when verification is paused." rows={2} />
	<div class="grid-2">
		<TextInput label="Footer" bind:value={footer} maxlength={500} />
		<TextInput label="Thumbnail URL" bind:value={thumb} maxlength={512} hint="https:// image URL." />
	</div>
</div>

<div class="card">
	<div class="card-title"><h2>Live preview</h2><span class="tag">exactly how it looks on Discord</span></div>
	<DiscordPreview
		title={title || 'Server Verification'}
		description={message || 'Click the button below to verify yourself and gain access to the server!'}
		footer={footer}
		thumbUrl={thumb}
		embedColor="#3b66ff"
		buttons={[{ label: 'Verify', style: 'primary', emoji: '✅' }]}
	/>
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
