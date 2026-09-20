<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import Select from '../../components/Select.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Toggle from '../../components/Toggle.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	// Mirror of src/lib/logging/logEvents.ts — keep labels/defaults in sync there.
	const GROUPS: Array<{ id: string; label: string; events: Array<{ key: string; label: string; hint: string; def: boolean }> }> = [
		{ id: 'moderation', label: 'Moderation', events: [
			{ key: 'mod.ban', label: 'Ban', hint: 'Member banned.', def: true },
			{ key: 'mod.unban', label: 'Unban', hint: 'Member unbanned.', def: true },
			{ key: 'mod.kick', label: 'Kick', hint: 'Member kicked.', def: true },
			{ key: 'mod.timeout', label: 'Timeout', hint: 'Member timed out.', def: true },
			{ key: 'mod.untimeout', label: 'Timeout removed', hint: 'Timeout removed.', def: false },
			{ key: 'mod.mute', label: 'Mute', hint: 'Member muted.', def: true },
			{ key: 'mod.unmute', label: 'Unmute', hint: 'Member unmuted.', def: false },
			{ key: 'mod.warn', label: 'Warn', hint: 'Warning issued.', def: true },
			{ key: 'mod.purge', label: 'Purge', hint: 'Bulk purge by a moderator.', def: true }
		]},
		{ id: 'members', label: 'Members', events: [
			{ key: 'member.join', label: 'Join', hint: 'Member joined.', def: false },
			{ key: 'member.leave', label: 'Leave', hint: 'Member left.', def: false },
			{ key: 'member.nickname', label: 'Nickname change', hint: 'Nickname changed.', def: true },
			{ key: 'member.roles', label: 'Role change', hint: 'Roles added or removed.', def: true },
			{ key: 'member.boost', label: 'Boost', hint: 'Server boost started/stopped.', def: true }
		]},
		{ id: 'messages', label: 'Messages', events: [
			{ key: 'message.edit', label: 'Message edited', hint: 'Message content edited.', def: true },
			{ key: 'message.delete', label: 'Message deleted', hint: 'Single message deleted.', def: true },
			{ key: 'message.bulkDelete', label: 'Bulk delete', hint: 'Messages bulk-deleted.', def: true }
		]},
		{ id: 'voice', label: 'Voice', events: [
			{ key: 'voice.join', label: 'Voice join', hint: 'Joined a voice channel.', def: false },
			{ key: 'voice.leave', label: 'Voice leave', hint: 'Left a voice channel.', def: false },
			{ key: 'voice.move', label: 'Voice move', hint: 'Moved between voice channels.', def: false }
		]},
		{ id: 'server', label: 'Server', events: [
			{ key: 'channel.create', label: 'Channel created', hint: '', def: true },
			{ key: 'channel.delete', label: 'Channel deleted', hint: '', def: true },
			{ key: 'channel.update', label: 'Channel updated', hint: 'Renames only.', def: false },
			{ key: 'role.create', label: 'Role created', hint: '', def: true },
			{ key: 'role.delete', label: 'Role deleted', hint: '', def: true },
			{ key: 'role.update', label: 'Role updated', hint: 'Name/color changes.', def: false },
			{ key: 'emoji.update', label: 'Emoji / sticker', hint: '', def: false },
			{ key: 'invite.create', label: 'Invite created', hint: '', def: false },
			{ key: 'invite.delete', label: 'Invite deleted', hint: '', def: false },
			{ key: 'thread.update', label: 'Thread created / deleted', hint: '', def: false }
		]},
		{ id: 'automod', label: 'AutoMod', events: [
			{ key: 'automod.action', label: 'AutoMod action', hint: 'Discord AutoMod rule triggered.', def: true }
		]}
	];

	const LEGACY = [
		{ key: 'modLogChannelId', label: 'Mod fallback', hint: 'Used for moderation events without an override.' },
		{ key: 'memberLogChannelId', label: 'Member fallback', hint: 'Join / leave / boost without an override.' },
		{ key: 'messageEditLogChannelId', label: 'Edit fallback', hint: '' },
		{ key: 'messageDeleteLogChannelId', label: 'Delete fallback', hint: '' },
		{ key: 'nicknameLogChannelId', label: 'Nickname fallback', hint: '' },
		{ key: 'roleLogChannelId', label: 'Role fallback', hint: '' }
	] as const;

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	let defaultChannel = $state('');
	let includeBots = $state(false);
	let toggles = $state<Record<string, boolean>>({});
	let overrides = $state<Record<string, string>>({});
	let legacy = $state<Record<string, string>>({});
	let ignoredChannels = $state<string[]>([]);
	let ignoredRoles = $state<string[]>([]);
	let ignoredUsersText = $state('');
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	function str(v: unknown): string {
		return typeof v === 'string' ? v : '';
	}

	function syncFromCache(): void {
		const cfg = entry.config ?? {};
		defaultChannel = str(cfg.logChannelId);
		includeBots = cfg.logIncludeBots === true;
		const ev = (cfg.logEvents ?? {}) as Record<string, boolean>;
		const ch = (cfg.logEventChannels ?? {}) as Record<string, string>;
		const t: Record<string, boolean> = {};
		const o: Record<string, string> = {};
		for (const g of GROUPS) for (const e of g.events) {
			t[e.key] = typeof ev[e.key] === 'boolean' ? ev[e.key] : e.def;
			o[e.key] = str(ch[e.key]);
		}
		toggles = t;
		overrides = o;
		const l: Record<string, string> = {};
		for (const f of LEGACY) l[f.key] = str(cfg[f.key]);
		legacy = l;
		ignoredChannels = Array.isArray(cfg.logIgnoredChannels) ? [...(cfg.logIgnoredChannels as string[])] : [];
		ignoredRoles = Array.isArray(cfg.logIgnoredRoles) ? [...(cfg.logIgnoredRoles as string[])] : [];
		ignoredUsersText = Array.isArray(cfg.logIgnoredUsers) ? (cfg.logIgnoredUsers as string[]).join(', ') : '';
		baseline = snapshot();
		saved = false;
	}

	function snapshot(): string {
		return JSON.stringify({ defaultChannel, includeBots, toggles, overrides, legacy, ignoredChannels: [...ignoredChannels].sort(), ignoredRoles: [...ignoredRoles].sort(), ignoredUsersText });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));
	const roles = $derived(entry.detail?.roles ?? []);
	const channels = $derived(entry.detail?.channels ?? []);

	function flipList(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}

	function toggleGroup(g: (typeof GROUPS)[number], on: boolean): void {
		for (const e of g.events) toggles[e.key] = on;
		saved = false;
	}

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const ignoredUsers = ignoredUsersText.split(',').map((s) => s.trim()).filter(Boolean);
			const patch: Record<string, unknown> = {
				logChannelId: defaultChannel === '' ? null : defaultChannel,
				logIncludeBots: includeBots,
				logEvents: { ...toggles },
				logEventChannels: { ...overrides },
				logIgnoredChannels: ignoredChannels,
				logIgnoredRoles: ignoredRoles,
				logIgnoredUsers: ignoredUsers
			};
			for (const f of LEGACY) patch[f.key] = legacy[f.key] === '' ? null : legacy[f.key];
			await saveGuildConfig(guildId, patch);
			baseline = snapshot();
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="Logging" description="Pick a default channel, toggle 31 event types, override per-event channels, and ignore noise." />

<div class="card">
	<h3>Default destination</h3>
	<div class="grid-2">
		<Select label="Default log channel" value={defaultChannel} options={channelOptions} hint="Events without a per-event or fallback channel are skipped." onchange={(v) => { defaultChannel = v; saved = false; }} />
		<Toggle title="Log bot actions" description="Include bot messages and bot join/leave events." checked={includeBots} onchange={(v) => { includeBots = v; saved = false; }} />
	</div>
</div>

{#each GROUPS as g (g.id)}
	<div class="card">
		<div class="group-head">
			<h3>{g.label}</h3>
			<div class="group-actions">
				<button type="button" class="link" onclick={() => toggleGroup(g, true)}>All on</button>
				<button type="button" class="link" onclick={() => toggleGroup(g, false)}>All off</button>
			</div>
		</div>
		{#each g.events as e (e.key)}
			<div class="event-row">
				<div class="event-toggle">
					<Toggle title={e.label} description={e.hint} checked={toggles[e.key] ?? e.def} onchange={(v) => { toggles[e.key] = v; saved = false; }} />
				</div>
				<div class="event-channel">
					<Select label="Channel override" value={overrides[e.key] ?? ''} options={channelOptions} noneLabel="Use default" hint="" onchange={(v) => { overrides[e.key] = v; saved = false; }} />
				</div>
			</div>
		{/each}
	</div>
{/each}

<div class="card">
	<h3>Fallback channels</h3>
	<p class="hint">Old per-category channels. Used when an event has no override — keep them or migrate to the default channel above.</p>
	<div class="grid-2">
		{#each LEGACY as f (f.key)}
			<Select label={f.label} value={legacy[f.key] ?? ''} options={channelOptions} hint={f.hint} onchange={(v) => { legacy[f.key] = v; saved = false; }} />
		{/each}
	</div>
</div>

<div class="card">
	<h3>Ignored noise</h3>
	<p class="hint">Events from ignored users, roles, or channels are never logged.</p>
	<div class="check-list">
		<div class="check-title">Channels</div>
		{#each channels as c (c.id)}
			<label><input type="checkbox" checked={ignoredChannels.includes(c.id)} onchange={() => { ignoredChannels = flipList(ignoredChannels, c.id); saved = false; }} /> #{c.name}</label>
		{/each}
	</div>
	<div class="check-list">
		<div class="check-title">Roles</div>
		{#each roles as r (r.id)}
			<label><input type="checkbox" checked={ignoredRoles.includes(r.id)} onchange={() => { ignoredRoles = flipList(ignoredRoles, r.id); saved = false; }} /> {r.name}</label>
		{/each}
	</div>
	<TextInput label="Ignored user IDs" bind:value={ignoredUsersText} placeholder="1234..., 5678..." hint="Comma-separated Discord user IDs." />
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />

<style>
	.group-head { display: flex; justify-content: space-between; align-items: center; }
	.group-actions { display: flex; gap: 0.75rem; }
	.link { background: none; border: none; color: var(--accent, #3b66ff); cursor: pointer; padding: 0; }
	.event-row { display: grid; grid-template-columns: 1fr 240px; gap: 1rem; align-items: start; border-top: 1px solid var(--border, #2a2d34); padding-top: 0.5rem; margin-top: 0.5rem; }
	.check-list { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.75rem 0; }
	.check-title { width: 100%; font-weight: 600; }
	.hint { opacity: 0.7; font-size: 0.9em; }
</style>
