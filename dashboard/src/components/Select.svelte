<script lang="ts">
	import { uid } from '../lib/id';

	export interface SelectOption {
		value: string;
		label: string;
	}

	let {
		label,
		value = $bindable(''),
		options = [],
		hint = '',
		allowNone = true,
		noneLabel = 'None',
		searchable,
		searchPlaceholder = 'Search…',
		onchange = undefined
	}: {
		label: string;
		value?: string | null | undefined;
		options?: SelectOption[];
		hint?: string;
		allowNone?: boolean;
		noneLabel?: string;
		searchable?: boolean;
		searchPlaceholder?: string;
		onchange?: ((value: string) => void) | undefined;
	} = $props();

	const id = uid('select');
	let query = $state('');

	// Long lists (roles, channels) get a filter box automatically; pages can force it.
	const showSearch = $derived(searchable ?? options.length >= 8);
	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => o.label.toLowerCase().includes(q));
	});
	// Never hide the currently-selected option behind the filter.
	const visible = $derived.by(() => {
		const list = filtered;
		if ((value ?? '') !== '' && !list.some((o) => o.value === value)) {
			const current = options.find((o) => o.value === value);
			if (current) return [current, ...list];
		}
		return list;
	});

	function handleChange(event: Event): void {
		const next = (event.currentTarget as HTMLSelectElement).value;
		value = next;
		onchange?.(next);
	}
</script>

<div class="field">
	<label for={id}>{label}</label>
	{#if showSearch}
		<input class="select-search" type="search" placeholder={searchPlaceholder} bind:value={query} aria-label={`Search ${label}`} />
	{/if}
	<select {id} value={value ?? ''} onchange={handleChange}>
		{#if allowNone}<option value="">{noneLabel}</option>{/if}
		{#each visible as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>

<style>
	.select-search {
		margin-bottom: 6px;
	}
</style>
