<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import SearchPicker from '../../components/SearchPicker.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Toggle from '../../components/Toggle.svelte';
	import RolePill from '../../components/RolePill.svelte';
	import ChannelPill from '../../components/ChannelPill.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));
	const GROUPS = $derived((((entry.config?.logEventGroups ?? []) as unknown[]).filter(isLogEventGroup)) as Array<{
		id: string;
		label: string;
		color: string;
		events: Array<{ key: string; label: string; description: string; defaultEnabled: boolean }>;
	}>);

	const LEGACY = [
		{ key: 'modLogChannelId', label: 'Mod fallback', hint: 'Used for moderation events without an override.' },
		{ key: 'memberLogChannelId', label: 'Member fallback', hint: 'Join / leave / boost without an override.' },
		{ key: 'messageEditLogChannelId', label: 'Edit fallback', hint: '' },
		{ key: 'messageDeleteLogChannelId', label: 'Delete fallback', hint: '' },
		{ key: 'nicknameLogChannelId', label: 'Nickname fallback', hint: '' },
		{ key: 'roleLogChannelId', label: 'Role fallback', hint: '' }
	] as const;

	let defaultChannel = $state('');
	let includeBots = $state(false);
	let toggles = $state<Record<string, boolean>>({});
	let overrides = $state<Record<string, string>>({});
	let legacy = $state<Record<string, string>>({});
	let ignoredChannels = $state<string[]>([]);
	let ignoredRoles = $state<string[]>([]);
	let ignoredUsersText = $state('');
	let ignoreChannelQuery = $state('');
	let ignoreRoleQuery = $state('');
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
			t[e.key] = typeof ev[e.key] === 'boolean' ? ev[e.key] : e.defaultEnabled;
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

	function matches(q: string, name: string): boolean {
		return name.toLowerCase().includes(q.trim().toLowerCase());
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}`, kind: 'channel' as const })));
	const roles = $derived(entry.detail?.roles ?? []);
	const channels = $derived(entry.detail?.channels ?? []);

	function flipList(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}

	function toggleGroup(g: (typeof GROUPS)[number], on: boolean): void {
		for (const e of g.events) toggles[e.key] = on;
		saved = false;
	}

	function isLogEventGroup(value: unknown): value is {
		id: string;
		label: string;
		color: string;
		events: Array<{ key: string; label: string; description: string; defaultEnabled: boolean }>;
	} {
		if (!value || typeof value !== 'object') return false;
		const group = value as Record<string, unknown>;
		return typeof group.id === 'string' && typeof group.label === 'string' && typeof group.color === 'string' && Array.isArray(group.events)
			&& group.events.every((event: unknown) => {
				if (!event || typeof event !== 'object') return false;
				const item = event as Record<string, unknown>;
				return typeof item.key === 'string' && typeof item.label === 'string' && typeof item.description === 'string' && typeof item.defaultEnabled === 'boolean';
			});
	}

	const hasLogEventGroups = $derived(Array.isArray(entry.config?.logEventGroups) && entry.config.logEventGroups.length > 0 && entry.config.logEventGroups.every(isLogEventGroup));

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
			if (!hasLogEventGroups) throw new Error('The logging event catalog is unavailable. Reload before applying changes.');
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

<PageHeader title="Logging" description="Configure the server-provided logging events, destinations, and ignored sources." />

{#if hasLogEventGroups}
<div class="card">
	<h3>Default destination</h3>
	<div class="grid-2">
		<SearchPicker label="Default log channel" value={defaultChannel} options={channelOptions} hint="Events without a per-event or fallback channel are skipped." onchange={(v) => { defaultChannel = v; saved = false; }} />
		<Toggle title="Log bot actions" description="Include bot messages and bot join/leave events." checked={includeBots} onchange={(v) => { includeBots = v; saved = false; }} />
	</div>
</div>

{#each GROUPS as g (g.id)}
	<div class="card">
		<div class="group-head">
			<h3 style={`--group-color: ${g.color}`}>{g.label}</h3>
			<div class="group-actions">
				<button type="button" class="link" onclick={() => toggleGroup(g, true)}>All on</button>
				<button type="button" class="link" onclick={() => toggleGroup(g, false)}>All off</button>
			</div>
		</div>
		{#each g.events as e (e.key)}
			<div class="event-row">
				<div class="event-toggle">
				<Toggle title={e.label} description={e.description} checked={toggles[e.key] ?? e.defaultEnabled} onchange={(v) => { toggles[e.key] = v; saved = false; }} />
				</div>
				<div class="event-channel">
					<SearchPicker label="Channel override" value={overrides[e.key] ?? ''} options={channelOptions} noneLabel="Use default" onchange={(v) => { overrides[e.key] = v; saved = false; }} />
				</div>
			</div>
		{/each}
	</div>
{/each}
{:else}
	<div class="card"><p class="hint">Logging controls are unavailable because the server event catalog could not be loaded. Reload this page before editing logging settings.</p></div>
{/if}

{#if hasLogEventGroups}
<div class="card">
	<h3>Fallback channels</h3>
	<p class="hint">Old per-category channels. Used when an event has no override — keep them or migrate to the default channel above.</p>
	<div class="grid-2">
		{#each LEGACY as f (f.key)}
			<SearchPicker label={f.label} value={legacy[f.key] ?? ''} options={channelOptions} hint={f.hint} onchange={(v) => { legacy[f.key] = v; saved = false; }} />
		{/each}
	</div>
</div>

<div class="card">
	<h3>Ignored noise</h3>
	<p class="hint">Events from ignored users, roles, or channels are never logged.</p>
	<div class="field" style="max-width: 320px;">
		<label for="ignore-channel-search">Search channels</label>
		<input id="ignore-channel-search" type="search" placeholder="Search…" bind:value={ignoreChannelQuery} />
	</div>
	<div class="check-list">
		<div class="check-title">Channels</div>
		{#each channels.filter((c) => !ignoreChannelQuery || matches(ignoreChannelQuery, c.name)) as c (c.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredChannels.includes(c.id)} onchange={() => { ignoredChannels = flipList(ignoredChannels, c.id); saved = false; }} /> <ChannelPill name={c.name} size="sm" /></label>
		{/each}
	</div>
	<div class="field" style="max-width: 320px;">
		<label for="ignore-role-search">Search roles</label>
		<input id="ignore-role-search" type="search" placeholder="Search…" bind:value={ignoreRoleQuery} />
	</div>
	<div class="check-list">
		<div class="check-title">Roles</div>
		{#each roles.filter((r) => !ignoreRoleQuery || matches(ignoreRoleQuery, r.name)) as r (r.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredRoles.includes(r.id)} onchange={() => { ignoredRoles = flipList(ignoredRoles, r.id); saved = false; }} /> <RolePill name={r.name} color={r.color} size="sm" /></label>
		{/each}
	</div>
	<TextInput label="Ignored user IDs" bind:value={ignoredUsersText} placeholder="1234..., 5678..." hint="Comma-separated Discord user IDs." />
</div>
{/if}

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />

<style>
	.group-head { display: flex; justify-content: space-between; align-items: center; }
	.group-head h3 { color: var(--group-color); }
	.group-actions { display: flex; gap: 0.75rem; }
	.link { background: none; border: none; color: var(--accent); cursor: pointer; padding: 0; }
	.event-row { display: grid; grid-template-columns: 1fr 240px; gap: 1rem; align-items: start; border-top: 1px solid var(--border, #2a2d34); padding-top: 0.5rem; margin-top: 0.5rem; }
	.check-list { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.75rem 0; }
	.check-title { width: 100%; font-weight: 600; }
	.hint { opacity: 0.7; font-size: 0.9em; }
</style>
