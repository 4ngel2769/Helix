<script lang="ts">
	import { guildEntry } from '../../lib/session.svelte';
	import { formatCount, go } from '../../lib/utils';
	import PageHeader from '../../components/PageHeader.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	const modules = $derived((entry.config?.modules as Record<string, boolean> | undefined) ?? {});
	const enabledCount = $derived(Object.values(modules).filter(Boolean).length);

	function channelLabel(id: unknown): string {
		if (typeof id !== 'string' || id === '') return 'Not set up';
		const found = entry.detail?.channels?.find((c) => c.id === id);
		return found ? `#${found.name}` : id;
	}

	function channelOrNotSet(id: unknown): string {
		return typeof id === 'string' && id !== '' ? channelLabel(id) : 'Not set up';
	}

	const prefixText = $derived(typeof entry.config?.prefix === 'string' && entry.config.prefix !== '' ? entry.config.prefix : null);
	const defaultPrefix = $derived(entry.detail?.defaultPrefix ?? 'x');
</script>

<PageHeader title="Overview" description="Server state at a glance. Jump into a section from the sidebar to change anything." />

{#if entry.detail}
	<div class="stat-grid">
		<div class="stat"><div class="value">{formatCount(entry.detail.memberCount)}</div><div class="label">Members</div></div>
		<div class="stat"><div class="value">{entry.detail.channels?.length ?? '—'}</div><div class="label">Text channels</div></div>
		<div class="stat"><div class="value">{entry.detail.roles?.length ?? '—'}</div><div class="label">Roles</div></div>
		<div class="stat"><div class="value">{enabledCount}/{Object.keys(modules).length}</div><div class="label">Modules on</div></div>
	</div>

	<div class="grid-2" style="margin-top: 16px;">
		<div class="card">
			<div class="card-title"><h2>Configuration</h2></div>
			<p class="card-desc">Core identifiers currently stored for this server.</p>
			<table class="table">
				<tbody>
					<tr><td class="muted">Prefix</td><td>{#if prefixText}<code>{prefixText}</code> <span class="muted small">(custom)</span>{:else}<code>{defaultPrefix}</code> <span class="muted small">(default)</span>{/if}</td></tr>
					<tr><td class="muted">Welcome channel</td><td>{channelOrNotSet(entry.config?.welcomeChannelId)}</td></tr>
					<tr><td class="muted">Mod log</td><td>{channelOrNotSet(entry.config?.modLogChannelId)}</td></tr>
					<tr><td class="muted">Verification</td><td>{entry.config?.verificationChannelId ? 'Enabled' : 'Not set up'}</td></tr>
				</tbody>
			</table>
		</div>
		<div class="card">
			<div class="card-title"><h2>Quick actions</h2></div>
			<p class="card-desc">Common tasks, one click away.</p>
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<a class="btn btn-ghost btn-sm" href={`/panel/guilds/${guildId}/general`} onclick={go(`/panel/guilds/${guildId}/general`)}>Edit general settings</a>
				<a class="btn btn-ghost btn-sm" href={`/panel/guilds/${guildId}/modules`} onclick={go(`/panel/guilds/${guildId}/modules`)}>Toggle modules</a>
				<a class="btn btn-ghost btn-sm" href={`/panel/guilds/${guildId}/moderation`} onclick={go(`/panel/guilds/${guildId}/moderation`)}>Review warnings</a>
			</div>
		</div>
	</div>
{/if}
