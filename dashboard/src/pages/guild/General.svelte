<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import type { CommandEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
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

	function toggleCommand(name: string): void {
		saved = false;
		disabled = disabled.includes(name) ? disabled.filter((c) => c !== name) : [...disabled, name];
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
	<TextInput label="Command prefix" value={prefix} placeholder="(default)" hint="1–5 characters. Empty means the bot default." />
	<div class="grid-2">
		<Select label="Admin role" bind:value={adminRoleId} options={roleOptions} />
		<Select label="Moderator role" bind:value={modRoleId} options={roleOptions} />
		<Select label="Mute role" bind:value={muteRoleId} options={roleOptions} />
		<Select label="Auto-role on join" bind:value={autoroleId} options={roleOptions} hint="Given to every new member." />
	</div>
</div>

<div class="card">
	<div class="card-title"><h2>Disabled commands</h2><span class="tag">{disabled.length} off</span></div>
	<p class="card-desc">Checked commands are turned off in this server.</p>
	{#if commands.length === 0}
		<p class="muted small">Command list unavailable.</p>
	{:else}
		<div class="check-list">
			{#each commands as cmd (cmd.name)}
				<label class="check-item">
					<input type="checkbox" checked={disabled.includes(cmd.name)} onchange={() => toggleCommand(cmd.name)} />
					<span class="mono">{cmd.name}</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />
