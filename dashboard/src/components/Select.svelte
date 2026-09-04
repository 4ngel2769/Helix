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
		noneLabel = 'None'
	}: {
		label: string;
		value?: string | null;
		options?: SelectOption[];
		hint?: string;
		allowNone?: boolean;
		noneLabel?: string;
	} = $props();

	const id = uid('select');
</script>

<div class="field">
	<label for={id}>{label}</label>
	<select {id} bind:value={value as string}>
		{#if allowNone}<option value="">{noneLabel}</option>{/if}
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>
