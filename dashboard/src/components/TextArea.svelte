<script lang="ts">
	import { uid } from '../lib/id';

	let {
		label,
		value = $bindable(''),
		placeholder = '',
		hint = '',
		rows = 4
	}: {
		label: string;
		value?: string | null;
		placeholder?: string;
		hint?: string;
		rows?: number;
	} = $props();

	const id = uid('textarea');
</script>

<div class="field">
	<label for={id}>{label}</label>
	<textarea {id} bind:value={value as string} {placeholder} {rows}></textarea>
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>
