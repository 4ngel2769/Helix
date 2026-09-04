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
		onchange = undefined
	}: {
		label: string;
		value?: string | null | undefined;
		options?: SelectOption[];
		hint?: string;
		allowNone?: boolean;
		noneLabel?: string;
		onchange?: ((value: string) => void) | undefined;
	} = $props();

	const id = uid('select');

	function handleChange(event: Event): void {
		const next = (event.currentTarget as HTMLSelectElement).value;
		value = next;
		onchange?.(next);
	}
</script>

<div class="field">
	<label for={id}>{label}</label>
	<select {id} value={value ?? ''} onchange={handleChange}>
		{#if allowNone}<option value="">{noneLabel}</option>{/if}
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>
