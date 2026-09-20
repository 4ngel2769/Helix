<script lang="ts">
	import { tick } from 'svelte';
	import RolePill from './RolePill.svelte';
	import ChannelPill from './ChannelPill.svelte';

	export interface PickerOption {
		value: string;
		label: string;
		color?: string | null;
		kind?: 'role' | 'channel' | 'plain';
	}

	let {
		label,
		value = $bindable(''),
		options = [],
		hint = '',
		allowNone = true,
		noneLabel = 'None',
		placeholder = 'Select…',
		onchange = undefined
	}: {
		label: string;
		value?: string | null | undefined;
		options?: PickerOption[];
		hint?: string;
		allowNone?: boolean;
		noneLabel?: string;
		placeholder?: string;
		onchange?: ((value: string) => void) | undefined;
	} = $props();

	let open = $state(false);
	let query = $state('');
	let box: HTMLDivElement | null = $state(null);
	let searchEl: HTMLInputElement | null = $state(null);

	const current = $derived(options.find((o) => o.value === (value ?? '')) ?? null);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => o.label.toLowerCase().includes(q) || o.value === value);
	});

	async function toggle(): Promise<void> {
		open = !open;
		query = '';
		if (open) {
			await tick();
			searchEl?.focus();
		}
	}

	function close(): void {
		open = false;
		query = '';
	}

	function pick(next: string): void {
		value = next;
		onchange?.(next);
		close();
	}

	function onWindowClick(e: MouseEvent): void {
		if (open && box && !box.contains(e.target as Node)) close();
	}

	function onKey(e: KeyboardEvent): void {
		if (!open) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'Enter' && filtered.length > 0) pick(filtered[0]!.value);
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div class="field">
	<span class="picker-label">{label}</span>
	<div class="picker" bind:this={box}>
		<button type="button" class="picker-btn" onclick={() => void toggle()} aria-haspopup="listbox" aria-expanded={open}>
			<span class="picker-current">
				{#if current}
					{#if current.kind === 'role'}<RolePill name={current.label.replace(/^@/, '')} color={current.color} size="sm" />
					{:else if current.kind === 'channel'}<ChannelPill name={current.label.replace(/^#/, '')} size="sm" />
					{:else}{current.label}{/if}
				{:else}<span class="picker-ph">{placeholder}</span>{/if}
			</span>
			<span class="picker-chev">{open ? '▴' : '▾'}</span>
		</button>
		{#if open}
			<div class="picker-menu" role="listbox">
				<div class="picker-search">
					<input
						bind:this={searchEl}
						type="search"
						placeholder="Search…"
						bind:value={query}
						aria-label={`Search ${label}`}
					/>
				</div>
				<div class="picker-list">
					{#if allowNone}
						<button type="button" class="picker-opt" onclick={() => pick('')}>
							<span class="picker-none">{noneLabel}</span>
						</button>
					{/if}
					{#each filtered as opt (opt.value)}
						<button type="button" class="picker-opt {opt.value === value ? 'sel' : ''}" onclick={() => pick(opt.value)}>
							{#if opt.kind === 'role'}<RolePill name={opt.label.replace(/^@/, '')} color={opt.color} size="sm" />
							{:else if opt.kind === 'channel'}<ChannelPill name={opt.label.replace(/^#/, '')} size="sm" />
							{:else}{opt.label}{/if}
						</button>
					{:else}
						<div class="picker-empty">No matches</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>

<style>
	.picker-label {
		display: block;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 6px;
	}
	.picker {
		position: relative;
	}
	.picker-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		padding: 9px 12px;
		cursor: pointer;
		color: inherit;
		font-size: 14px;
	}
	.picker-btn:hover {
		border-color: var(--border-strong);
	}
	.picker-current {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.picker-ph {
		opacity: 0.55;
	}
	.picker-chev {
		opacity: 0.6;
		flex: none;
	}
	.picker-menu {
		position: absolute;
		z-index: 40;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		background: var(--bg-soft);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
		overflow: hidden;
	}
	.picker-search {
		padding: 8px;
		border-bottom: 1px solid var(--border);
	}
	.picker-search input {
		width: 100%;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		padding: 8px 10px;
		color: inherit;
		font-size: 14px;
		outline: none;
	}
	.picker-search input:focus {
		border-color: var(--accent);
	}
	.picker-list {
		max-height: 240px;
		overflow-y: auto;
		padding: 4px;
	}
	.picker-opt {
		width: 100%;
		display: flex;
		align-items: center;
		background: none;
		border: none;
		border-radius: var(--r-sm);
		padding: 7px 10px;
		cursor: pointer;
		color: inherit;
		font-size: 14px;
		text-align: left;
	}
	.picker-opt:hover {
		background: var(--accent-soft);
	}
	.picker-opt.sel {
		background: var(--accent-soft);
		outline: 1px solid var(--accent);
	}
	.picker-none {
		opacity: 0.65;
	}
	.picker-empty {
		padding: 12px;
		opacity: 0.6;
		font-size: 13px;
		text-align: center;
	}
</style>
