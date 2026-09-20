<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import PageHeader from '../../components/PageHeader.svelte';
	import SearchPicker from '../../components/SearchPicker.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import Toggle from '../../components/Toggle.svelte';
	import RolePill from '../../components/RolePill.svelte';
	import ChannelPill from '../../components/ChannelPill.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	const channels = $derived(entry.detail?.channels ?? []);
	const roles = $derived(entry.detail?.roles ?? []);

	const LISTS = [
		{ key: 'profanity', label: 'Profanity', hint: 'Swears and slurs, one per line.' },
		{ key: 'scams', label: 'Scams', hint: 'Crypto doublers, fake giveaways, one per line.' },
		{ key: 'phishing', label: 'Phishing', hint: 'Fake login / token-grabber patterns, one per line.' },
		{ key: 'custom', label: 'Custom', hint: 'Your own blocked words, one per line.' }
	] as const;

	const ACTIONS = [
		{ value: 'delete', label: 'Delete only' },
		{ value: 'delete_warn', label: 'Delete + warn' },
		{ value: 'delete_timeout', label: 'Delete + warn + timeout' }
	];

	// Keyword lists (feed the /automod preset installer)
	let values = $state<Record<string, string>>({ profanity: '', scams: '', phishing: '', custom: '' });

	// Helix custom filters (enforced by the bot in messageCreate)
	let fxEnabled = $state(false);
	let blockInvites = $state(false);
	let blockLinks = $state(false);
	let zalgo = $state(false);
	let capsOn = $state(true);
	let capsMin = $state(10);
	let capsPct = $state(70);
	let emojiOn = $state(true);
	let emojiMax = $state(10);
	let spamOn = $state(true);
	let spamCount = $state(5);
	let spamSecs = $state(10);
	let action = $state('delete');
	let timeoutSecs = $state(600);
	let ignoredChannels = $state<string[]>([]);
	let ignoredRoles = $state<string[]>([]);
	let ignoreChannelQuery = $state('');
	let ignoreRoleQuery = $state('');

	// Discord native rules
	interface NativeRule { id: string; name: string; trigger: string; enabled: boolean }
	let nativeRules = $state<NativeRule[]>([]);
	let rulesLoading = $state(true);
	let rulesError = $state<string | null>(null);
	let installing = $state<string | null>(null);

	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	function flipList(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}
	function matches(q: string, name: string): boolean {
		return name.toLowerCase().includes(q.trim().toLowerCase());
	}
	function num(v: unknown, fallback: number): number {
		return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
	}

	function syncFromCache(): void {
		const cfg = entry.config ?? {};
		const kw = (cfg.automodKeywords ?? {}) as Record<string, string[]>;
		const next: Record<string, string> = {};
		for (const l of LISTS) {
			const arr = kw[l.key];
			next[l.key] = Array.isArray(arr) ? arr.join('\n') : '';
		}
		values = next;

		const fx = (cfg.automodSettings ?? {}) as Record<string, unknown>;
		const caps = (fx.caps ?? {}) as Record<string, unknown>;
		const emoji = (fx.emoji ?? {}) as Record<string, unknown>;
		const spam = (fx.spam ?? {}) as Record<string, unknown>;
		fxEnabled = fx.enabled === true;
		blockInvites = fx.blockInvites === true;
		blockLinks = fx.blockLinks === true;
		zalgo = fx.zalgo === true;
		capsOn = caps.enabled !== false;
		capsMin = num(caps.minLength, 10);
		capsPct = num(caps.percent, 70);
		emojiOn = emoji.enabled !== false;
		emojiMax = num(emoji.max, 10);
		spamOn = spam.enabled !== false;
		spamCount = num(spam.count, 5);
		spamSecs = num(spam.intervalSeconds, 10);
		action = typeof fx.action === 'string' ? fx.action : 'delete';
		timeoutSecs = num(fx.timeoutSeconds, 600);
		ignoredChannels = Array.isArray(fx.ignoredChannels) ? (fx.ignoredChannels as string[]) : [];
		ignoredRoles = Array.isArray(fx.ignoredRoles) ? (fx.ignoredRoles as string[]) : [];

		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ values, fxEnabled, blockInvites, blockLinks, zalgo, capsOn, capsMin, capsPct, emojiOn, emojiMax, spamOn, spamCount, spamSecs, action, timeoutSecs, ignoredChannels, ignoredRoles });
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const automodKeywords: Record<string, string[]> = {};
			for (const l of LISTS) {
				automodKeywords[l.key] = values[l.key].split('\n').map((s) => s.trim()).filter(Boolean);
			}
			await saveGuildConfig(guildId, {
				automodKeywords,
				automodSettings: {
					enabled: fxEnabled,
					blockInvites,
					blockLinks,
					zalgo,
					caps: { enabled: capsOn, minLength: capsMin, percent: capsPct },
					emoji: { enabled: emojiOn, max: emojiMax },
					spam: { enabled: spamOn, count: spamCount, intervalSeconds: spamSecs },
					action,
					timeoutSeconds: timeoutSecs,
					ignoredChannels,
					ignoredRoles
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

	async function loadNativeRules(): Promise<void> {
		rulesLoading = true;
		rulesError = null;
		try {
			const data = await api<{ rules: NativeRule[] }>(`/guilds/${guildId}/automod-rules`);
			nativeRules = data.rules;
		} catch (e) {
			rulesError = e instanceof Error ? e.message : 'Failed to load native rules';
		} finally {
			rulesLoading = false;
		}
	}

	async function installPreset(preset: string): Promise<void> {
		installing = preset;
		rulesError = null;
		try {
			const data = await api<{ created: string[]; failed: Array<{ name: string; reason: string }> }>(`/guilds/${guildId}/automod-rules`, {
				method: 'POST',
				body: { action: 'install', preset }
			});
			if (data.failed.length > 0) {
				rulesError = `Installed ${data.created.length}, skipped ${data.failed.length}: ${data.failed.map((f) => `${f.name} (${f.reason})`).join('; ')}`;
			}
			await loadNativeRules();
		} catch (e) {
			rulesError = e instanceof Error ? e.message : 'Install failed';
		} finally {
			installing = null;
		}
	}

	async function deleteRule(id: string, name: string): Promise<void> {
		if (!window.confirm(`Delete native rule "${name}"?`)) return;
		rulesError = null;
		try {
			await api(`/guilds/${guildId}/automod-rules`, { method: 'DELETE', query: { ruleId: id } });
			await loadNativeRules();
		} catch (e) {
			rulesError = e instanceof Error ? e.message : 'Delete failed';
		}
	}

	onMount(() => {
		void loadNativeRules();
	});
</script>

<PageHeader title="AutoMod" description="Three layers: Helix filters (instant, bot-side), keyword lists (feed the Discord presets), and live Discord native rules." />

<div class="card">
	<h3>Helix filters</h3>
	<p class="hint">Enforced by the bot on every message. Members with Manage Messages plus ignored channels/roles are exempt. Violations are logged as AutoMod actions and earn no XP.</p>
	<Toggle title="Enable Helix filters" description="Delete messages matching the filters below." checked={fxEnabled} onchange={(v) => { fxEnabled = v; saved = false; }} />
	<div class="grid-2" style="margin-top: 12px;">
		<Toggle title="Block Discord invites" description="Delete messages containing discord.gg / discord.com/invite links." checked={blockInvites} onchange={(v) => { blockInvites = v; saved = false; }} />
		<Toggle title="Block links" description="Delete messages containing http(s) links." checked={blockLinks} onchange={(v) => { blockLinks = v; saved = false; }} />
		<Toggle title="Caps filter" description="Delete ALL-CAPS shouting." checked={capsOn} onchange={(v) => { capsOn = v; saved = false; }} />
		<Toggle title="Emoji spam filter" description="Delete messages stuffed with emoji." checked={emojiOn} onchange={(v) => { emojiOn = v; saved = false; }} />
		<Toggle title="Spam filter" description="Delete rapid repeat messages." checked={spamOn} onchange={(v) => { spamOn = v; saved = false; }} />
		<Toggle title="Zalgo filter" description="Delete glitch-text (combining marks)." checked={zalgo} onchange={(v) => { zalgo = v; saved = false; }} />
	</div>
	<div class="grid-3" style="margin-top: 12px;">
		<div class="field"><label for="am-capsmin">Caps min letters</label><input id="am-capsmin" type="number" min={5} max={500} bind:value={capsMin} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="am-capspct">Caps % threshold</label><input id="am-capspct" type="number" min={10} max={100} bind:value={capsPct} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="am-emojimax">Max emoji</label><input id="am-emojimax" type="number" min={1} max={100} bind:value={emojiMax} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="am-spamcount">Spam messages</label><input id="am-spamcount" type="number" min={2} max={20} bind:value={spamCount} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="am-spamsecs">Spam window (sec)</label><input id="am-spamsecs" type="number" min={2} max={120} bind:value={spamSecs} oninput={() => (saved = false)} /></div>
		<div class="field"><label for="am-timeout">Timeout (sec)</label><input id="am-timeout" type="number" min={10} max={2419200} bind:value={timeoutSecs} oninput={() => (saved = false)} /></div>
	</div>
	<div class="field" style="max-width: 320px;">
		<label for="am-action">On violation</label>
		<select id="am-action" bind:value={action} onchange={() => (saved = false)}>
			{#each ACTIONS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
		</select>
	</div>
	<div class="field" style="max-width: 320px;">
		<label for="am-ignore-channel-search">Exempt channels</label>
		<input id="am-ignore-channel-search" type="search" placeholder="Search…" bind:value={ignoreChannelQuery} />
	</div>
	<div class="check-list">
		{#each channels.filter((c) => !ignoreChannelQuery || c.name.toLowerCase().includes(ignoreChannelQuery.trim().toLowerCase())) as c (c.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredChannels.includes(c.id)} onchange={() => { ignoredChannels = flipList(ignoredChannels, c.id); saved = false; }} /> <ChannelPill name={c.name} size="sm" /></label>
		{/each}
	</div>
	<div class="field" style="max-width: 320px;">
		<label for="am-ignore-role-search">Exempt roles</label>
		<input id="am-ignore-role-search" type="search" placeholder="Search…" bind:value={ignoreRoleQuery} />
	</div>
	<div class="check-list">
		{#each roles.filter((r) => !ignoreRoleQuery || r.name.toLowerCase().includes(ignoreRoleQuery.trim().toLowerCase())) as r (r.id)}
			<label class="check-item"><input type="checkbox" checked={ignoredRoles.includes(r.id)} onchange={() => { ignoredRoles = flipList(ignoredRoles, r.id); saved = false; }} /> <RolePill name={r.name} color={r.color} size="sm" /></label>
		{/each}
	</div>
</div>

<div class="card">
	<h3>Keyword lists</h3>
	<p class="hint">Blocked word lists (case-insensitive). Used when installing a Discord preset below — the preset rules are built from these lists plus Helix defaults.</p>
	<div class="grid-2">
		{#each LISTS as l (l.key)}
			<TextArea label={l.label} bind:value={values[l.key]} hint={l.hint} rows={6} />
		{/each}
	</div>
</div>

<div class="card">
	<h3>Discord native rules</h3>
	<p class="hint">Rules enforced by Discord itself (block before send). Limits: 6 keyword, 1 spam, 1 mention-spam, 1 preset per server. Timeout actions only work on keyword + mention-spam rules.</p>
	{#if rulesLoading}
		<p class="loading">Loading native rules…</p>
	{:else if nativeRules.length === 0}
		<p class="hint">No native rules yet — install a preset or create rules with /automod.</p>
	{:else}
		<table class="table">
			<thead><tr><th>Rule</th><th>Type</th><th>Status</th><th></th></tr></thead>
			<tbody>
				{#each nativeRules as r (r.id)}
					<tr>
						<td><strong>{r.name}</strong><br /><span class="small muted mono">{r.id}</span></td>
						<td class="small">{r.trigger}</td>
						<td>{#if r.enabled}<span class="tag tag-on">on</span>{:else}<span class="tag">off</span>{/if}</td>
						<td><button type="button" class="btn btn-ghost btn-sm" onclick={() => void deleteRule(r.id, r.name)}>Delete</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if rulesError}<div class="notice notice-error" style="margin-top: 8px;">{rulesError}</div>{/if}
	<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
		<button type="button" class="btn btn-ghost btn-sm" disabled={installing !== null} onclick={() => void installPreset('low')}>{installing === 'low' ? 'Installing…' : 'Install Low preset'}</button>
		<button type="button" class="btn btn-ghost btn-sm" disabled={installing !== null} onclick={() => void installPreset('medium')}>{installing === 'medium' ? 'Installing…' : 'Install Medium preset'}</button>
		<button type="button" class="btn btn-ghost btn-sm" disabled={installing !== null} onclick={() => void installPreset('high')}>{installing === 'high' ? 'Installing…' : 'Install High preset'}</button>
	</div>
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />

<style>
	.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
	@media (max-width: 700px) { .grid-3 { grid-template-columns: 1fr; } }
	.hint { opacity: 0.7; font-size: 0.9em; }
	.check-list { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.75rem 0; }
	.check-item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
</style>
