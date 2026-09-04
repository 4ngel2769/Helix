<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '../../lib/api';
	import type { ModuleEntry } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import Toggle from '../../components/Toggle.svelte';

	let { guildId }: { guildId: string } = $props();

	let modules = $state<ModuleEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ modules: ModuleEntry[] }>(`/guilds/${guildId}/modules`);
			modules = data.modules;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load modules';
		} finally {
			loading = false;
		}
	}

	async function setModule(key: string, enabled: boolean): Promise<void> {
		notice = null;
		error = null;
		const previous = modules.find((m) => m.key === key);
		if (previous) previous.enabled = enabled;
		try {
			await api(`/guilds/${guildId}/modules`, { method: 'PATCH', body: { modules: { [key]: enabled } } });
			notice = `Module "${key}" ${enabled ? 'enabled' : 'disabled'}.`;
		} catch (e) {
			if (previous) previous.enabled = !enabled;
			error = e instanceof Error ? e.message : 'Update failed';
		}
	}

	onMount(() => void load());
</script>

<PageHeader title="Modules" description="Turn whole feature areas on or off. Changes apply immediately." />

{#if loading}
	<p class="loading">Loading modules…</p>
{:else if error && modules.length === 0}
	<div class="notice notice-error">{error}</div>
{:else}
	{#if error}<div class="notice notice-error">{error}</div>{/if}
	{#if notice}<div class="notice notice-ok">{notice}</div>{/if}
	<div class="card">
		{#each modules as mod (mod.key)}
			<Toggle
				title={mod.name}
				description={mod.description}
				checked={mod.enabled}
				onchange={(value) => void setModule(mod.key, value)}
			/>
		{/each}
	</div>
{/if}
