<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import PageHeader from '../../components/PageHeader.svelte';
	import SearchPicker from '../../components/SearchPicker.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Toggle from '../../components/Toggle.svelte';
	import RolePill from '../../components/RolePill.svelte';
	import ChannelPill from '../../components/ChannelPill.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));
	const channels = $derived(entry.detail?.channels ?? []);
	const roles = $derived(entry.detail?.roles ?? []);
	const channelOptions = $derived(channels.map((c) => ({ value: c.id, label: `#${c.name}`, kind: 'channel' as const })));
	const roleOptions = $derived(roles.map((r) => ({ value: r.id, label: `@${r.name}`, color: r.color, kind: 'role' as const })));

	let xpMin = $state(15);
	let xpMax = $state(25);
	let cooldown = $state(60);
	let voiceXp = $state(0);
	let levelUpChannel = $state('');
	let levelUpMessage = $state('');
	let stackRewards = $state(false);
	let ignoredChannels = $state<string[]>([]);
	let ignoredRoles = $state<string[]>([]);
	let rewards = $state<Array<{ level: number; roleId: string }>>([]);
	let newRewardLevel = $state(5);
	let newRewardRole = $state('');
	let ignoreChannelQuery = $state('');
	let ignoreRoleQuery = $state('');
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	interface LbEntry {
		rank: number;
		userId: string;
		xp: number;
		level: number;
		into: number;
		needed: number;
	}
	let lb = $state<LbEntry[]>([]);
	let lbError = $state<string | null>(null);
	let lbLoading = $state(false);

	async function loadLeaderboard(): Promise<void> {
		lbLoading = true;
		lbError = null;
		try {
			const data = await api<{ entries: LbEntry[] }>(`/guilds/${guildId}/leaderboard`, { query: { limit: 25 } });
			lb = data.entries ?? [];
		} catch (e) {
			lbError = e instanceof Error ? e.message : 'Could not load the leaderboard';
		} finally {
			lbLoading = false;
		}
	}

	$effect(() => {
		if (guildId) void loadLeaderboard();
	});

	function num(v: unknown, fallback: number): number {
		return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
	}
	function str(v: unknown): string {
		return typeof v === 'string' ? v : '';
	}
	function flipList(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}
	function matches(q: string, name: string): boolean {
		return name.toLowerCase().includes(q.trim().toLowerCase());
	}
	function roleName(id: string): string {
		return roles.find((r) => r.id === id)?.name ?? id;
	}
	function roleColor(id: string): string {
		return roles.find((r) => r.id === id)?.color ?? '';
	}

	function syncFromCache(): void {
		const lv = (entry.config?.leveling ?? {}) as Record<string, unknown>;
		xpMin = num(lv.xpMin, 15);
		xpMax = num(lv.xpMax, 25);
		cooldown = num(lv.cooldownSeconds, 60);
		voiceXp = num(lv.voiceXpPerMinute, 0);
		levelUpChannel = str(lv.levelUpChannelId);
		levelUpMessage = str(lv.levelUpMessage);
		stackRewards = lv.stackRewards === true;
		ignoredChannels = Array.isArray(lv.ignoredChannels) ? (lv.ignoredChannels as string[]) : [];
		ignoredRoles = Array.isArray(lv.ignoredRoles) ? (lv.ignoredRoles as string[]) : [];
		rewards = Array.isArray(lv.roleRewards)
			? (lv.roleRewards as Array<{ level: number; roleId: string }>).filter((r) => typeof r?.level === 'number' && typeof r?.roleId === 'string')
			: [];
		newRewardLevel = 5;
		newRewardRole = '';
		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ xpMin, xpMax, cooldown, voiceXp, levelUpChannel, levelUpMessage, stackRewards, ignoredChannels, ignoredRoles, rewards });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);

	function addReward(): void {
		const level = Math.floor(Number(newRewardLevel));
		if (!Number.isInteger(level) || level < 2 || !newRewardRole) return;
		if (rewards.some((r) => r.level === level)) {
			error = `A reward for level ${level} already exists.`;
			return;
		}
		error = null;
		rewards = [...rewards, { level, roleId: newRewardRole }].sort((a, b) => a.level - b.level);
		newRewardRole = '';
		saved = false;
	}

	async function save(): Promise<void> {
		if (xpMin > xpMax) {
			error = 'Min XP must not exceed max XP.';
			return;
		}
		saving = true;
		error = null;
		try {
			await saveGuildConfig(guildId, {
				leveling: {
					xpMin,
					xpMax,
					cooldownSeconds: cooldown,
				voiceXpPerMinute: voiceXp,
					levelUpChannelId: levelUpChannel === '' ? null : levelUpChannel,
					levelUpMessage: levelUpMessage.trim() === '' ? null : levelUpMessage,
					ignoredChannels,
					ignoredRoles,
					roleRewards: rewards,
					stackRewards
				}
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

<PageHeader title="Leveling" description="XP for chatting, level-up announcements, and role rewards. Switched on/off via the Modules page or /configmodule — this page tunes how it behaves. Commands: /rank, /leaderboard." />

<div class="card">
	<div class="grid-3">
		<div class="field"><label for="lv-min">Min XP per message</label><input id="lv-min" type="number" min={1} max={1000} bind:value={xpMin} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="lv-max">Max XP per message</label><input id="lv-max" type="number" min={1} max={1000} bind:value={xpMax} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="lv-cool">Cooldown (seconds)</label><input id="lv-cool" type="number" min={0} max={3600} bind:value={cooldown} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="lv-voice">Voice XP per minute</label><input id="lv-voice" type="number" min={0} max={1000} bind:value={voiceXp} oninput={() => (saved = false)} /></div>
	</div>
	<div class="grid-2" style="margin-top: 12px;">
		<SearchPicker label="Level-up channel" value={levelUpChannel} options={channelOptions} noneLabel="Same channel" onchange={(v) => { levelUpChannel = v; saved = false; }} />
			<TextInput label="Level-up message" bind:value={levelUpMessage} maxlength={500} placeholder="Celebration text with placeholders" hint="Placeholders: user, username, level, xp in curly braces. Empty = default." />
	</div>
</div>

<div class="card">
	<h3>Role rewards</h3>
	<p class="hint">Granted on level-up{stackRewards ? ' (all earned rewards stack).' : ' (only the highest earned reward is kept).'}</p>
	<Toggle title="Stack rewards" description="Keep every earned reward role instead of only the highest." checked={stackRewards} onchange={(v) => { stackRewards = v; saved = false; }} />
	{#if rewards.length === 0}
		<p class="hint">No rewards yet.</p>
	{:else}
		<div class="reward-list">
			{#each rewards as r (r.level)}
				<div class="reward-row">
					<span class="tag">Lvl {r.level}</span>
					<RolePill name={roleName(r.roleId)} color={roleColor(r.roleId)} size="sm" />
					<button type="button" class="link" onclick={() => { rewards = rewards.filter((x) => x.level !== r.level); saved = false; }}>Remove</button>
				</div>
			{/each}
		</div>
	{/if}
	<div style="display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-top: 8px;">
		<div class="field" style="max-width: 110px; margin: 0;"><label for="lv-reward-level">Level</label><input id="lv-reward-level" type="number" min={2} max={1000} bind:value={newRewardLevel} /></div>
		<div style="min-width: 220px; flex: 1;"><SearchPicker label="Role" value={newRewardRole} options={roleOptions} onchange={(v) => (newRewardRole = v)} /></div>
		<button type="button" class="btn btn-ghost btn-sm" onclick={addReward}>Add reward</button>
	</div>
</div>

<div class="card">
	<h3>No-XP zones</h3>
	<p class="hint">Messages here earn no XP (bot channels, staff rooms…).</p>
	<div class="field" style="max-width: 320px;">
		<label for="lv-ignore-channel-search">Search channels</label>
		<input id="lv-ignore-channel-search" type="search" placeholder="Search…" bind:value={ignoreChannelQuery} />
	</div>
	<div class="check-list">
		{#each channels.filter((c) => !ignoreChannelQuery || matches(ignoreChannelQuery, c.name)) as c (c.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredChannels.includes(c.id)} onchange={() => { ignoredChannels = flipList(ignoredChannels, c.id); saved = false; }} /> <ChannelPill name={c.name} size="sm" /></label>
		{/each}
	</div>
	<div class="field" style="max-width: 320px;">
		<label for="lv-ignore-role-search">Search roles</label>
		<input id="lv-ignore-role-search" type="search" placeholder="Search…" bind:value={ignoreRoleQuery} />
	</div>
	<div class="check-list">
		{#each roles.filter((r) => !ignoreRoleQuery || matches(ignoreRoleQuery, r.name)) as r (r.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredRoles.includes(r.id)} onchange={() => { ignoredRoles = flipList(ignoredRoles, r.id); saved = false; }} /> <RolePill name={r.name} color={r.color} size="sm" /></label>
		{/each}
	</div>
</div>

<div class="card">
	<h3>Leaderboard</h3>
	{#if lbLoading}
		<p class="hint">Loading…</p>
	{:else if lbError}
		<p class="hint">{lbError}</p>
	{:else if lb.length === 0}
		<p class="hint">Nobody has earned XP here yet.</p>
	{:else}
		<table class="lb">
			<thead>
				<tr><th>#</th><th>Member</th><th>Level</th><th>XP</th><th>Progress</th></tr>
			</thead>
			<tbody>
				{#each lb as row (row.userId)}
					<tr>
						<td>{row.rank}</td>
						<td><a href={`https://discord.com/users/${row.userId}`} target="_blank" rel="noreferrer">{row.userId}</a></td>
						<td>{row.level}</td>
						<td>{row.xp.toLocaleString('en-US')}</td>
						<td>{Math.round((row.into / Math.max(1, row.needed)) * 100)}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />

<style>
	.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
	@media (max-width: 700px) { .grid-3 { grid-template-columns: 1fr; } }
	.hint { opacity: 0.7; font-size: 0.9em; }
	.reward-list { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
	.reward-row { display: flex; align-items: center; gap: 10px; }
	.link { background: none; border: none; color: var(--accent, #3b66ff); cursor: pointer; padding: 0; }
	.check-list { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.75rem 0; }
	.check-item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
	.lb { width: 100%; border-collapse: collapse; font-size: 0.92em; }
	.lb th, .lb td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border, rgba(127, 127, 127, 0.25)); }
	.lb a { color: inherit; }
</style>
