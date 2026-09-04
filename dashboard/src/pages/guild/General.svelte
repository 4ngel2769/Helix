<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import type { CommandEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import RolePill from '../../components/RolePill.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Select from '../../components/Select.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	let prefix = $state('');
	let adminRoleId = $state('');
	let modRoleId = $state('');
	let muteRoleId = $state('');
	let autoroleId = $state('');
	let disabled: string[] = $state([]);
	let commands = $state<CommandEntry[]>([]);
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const str = (v: unknown): string => (typeof v === 'string' ? v : '');

	function syncFromCache(): void {
		const cfg = entry.config;
		if (!cfg) return;
		prefix = str(cfg.prefix);
		adminRoleId = str(cfg.adminRoleId);
		modRoleId = str(cfg.modRoleId);
		muteRoleId = str(cfg.muteRoleId);
		autoroleId = str(cfg.autoroleId);
		disabled = Array.isArray(cfg.disabledCommands) ? [...(cfg.disabledCommands as string[])] : [];
		baseline = snapshot();
	}

	function snapshot(): string {
		return JSON.stringify({ prefix, adminRoleId, modRoleId, muteRoleId, autoroleId, disabled: [...disabled].sort() });
	}

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const roleOptions = $derived((entry.detail?.roles ?? []).map((r) => ({ value: r.id, label: `@${r.name}` })));
	// Cached roles (+ colors) from guild detail — no extra fetch per select.
	const roleById = $derived(new Map((entry.detail?.roles ?? []).map((r) => [r.id, r])));
	function pillFor(id: string): { name: string; color: string } | null {
		if (!id) return null;
		const r = roleById.get(id);
		if (!r) return null;
		return { name: r.name, color: r.color };
	}

	// Commands grouped by category for per-category toggling.
	const grouped = $derived(() => {
		const map = new Map<string, CommandEntry[]>();
		for (const cmd of commands) {
			const cat = cmd.category ?? 'Other';
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push(cmd);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	function toggleCommand(name: string): void {
		saved = false;
		disabled = disabled.includes(name) ? disabled.filter((c) => c !== name) : [...disabled, name];
	}

	function toggleCategory(cmds: CommandEntry[]): void {
		saved = false;
		const names = cmds.map((c) => c.name);
		const allOff = names.every((n) => disabled.includes(n));
		if (allOff) {
			disabled = disabled.filter((d) => !names.includes(d));
		} else {
			disabled = [...new Set([...disabled, ...names])];
		}
	}

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const nil = (v: string): string | null => (v === '' ? null : v);
			await saveGuildConfig(guildId, {
				prefix: prefix === '' ? null : prefix,
				adminRoleId: nil(adminRoleId),
				modRoleId: nil(modRoleId),
				muteRoleId: nil(muteRoleId),
				autoroleId: nil(autoroleId),
				disabledCommands: disabled
			});
			baseline = snapshot();
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		try {
			const data = await api<{ commands: CommandEntry[] }>('/commands');
			commands = data.commands;
		} catch {
			commands = [];
		}
	});
</script>

<PageHeader title="General" description="Prefix, staff roles, join role and per-command toggles." />

<div class="card">
	<div class="card-title"><h2>Prefix & roles</h2></div>
	<TextInput label="Command prefix" bind:value={prefix} placeholder="x (default)" hint="1–5 characters. Empty means the bot default (x)." />
	<div class="grid-2">
		<div class="role-select-wrap">
			<Select label="Admin role" bind:value={adminRoleId} options={roleOptions} />
			{#if pillFor(adminRoleId)}<RolePill name={pillFor(adminRoleId)!.name} color={pillFor(adminRoleId)!.color} size="sm" />{/if}
		</div>
		<div class="role-select-wrap">
			<Select label="Moderator role" bind:value={modRoleId} options={roleOptions} />
			{#if pillFor(modRoleId)}<RolePill name={pillFor(modRoleId)!.name} color={pillFor(modRoleId)!.color} size="sm" />{/if}
		</div>
		<div class="role-select-wrap">
			<Select label="Mute role" bind:value={muteRoleId} options={roleOptions} />
			{#if pillFor(muteRoleId)}<RolePill name={pillFor(muteRoleId)!.name} color={pillFor(muteRoleId)!.color} size="sm" />{/if}
		</div>
		<div class="role-select-wrap">
			<Select label="Auto-role on join" bind:value={autoroleId} options={roleOptions} hint="Given to every new member." />
			{#if pillFor(autoroleId)}<RolePill name={pillFor(autoroleId)!.name} color={pillFor(autoroleId)!.color} size="sm" />{/if}
		</div>
	</div>
</div>

<div class="card">
	<div class="card-title"><h2>Disabled commands</h2><span class="tag">{disabled.length} off</span></div>
	<p class="card-desc">Checked commands are turned off in this server. Toggle a whole category, or pick individual commands. Whole feature areas can also be switched off under <a href={`/panel/guilds/${guildId}/modules`}>Modules</a> (Sapphire module toggles).</p>
	{#if commands.length === 0}
		<p class="muted small">Command list unavailable.</p>
	{:else}
		{#each grouped() as [category, cmds] (category)}
			{@const allOff = cmds.every((c) => disabled.includes(c.name))}
			{@const someOff = !allOff && cmds.some((c) => disabled.includes(c.name))}
			<div class="card-title" style="margin-top: 14px;">
				<h3>{category} <span class="tag">{cmds.filter((c) => disabled.includes(c.name)).length}/{cmds.length} off</span></h3>
				<button class="btn btn-ghost btn-sm" onclick={() => toggleCategory(cmds)}>{allOff ? 'Enable all' : 'Disable all'}</button>
			</div>
			<div class="check-list" style="margin-bottom: 6px;">
				{#each cmds as cmd (cmd.name)}
					<label class="check-item" title={cmd.description}>
						<input type="checkbox" checked={disabled.includes(cmd.name)} onchange={() => toggleCommand(cmd.name)} />
						<span class="mono">{cmd.name}</span>
					</label>
				{/each}
			</div>
		{/each}
	{/if}
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
