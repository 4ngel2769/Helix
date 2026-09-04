<script lang="ts">
	import { uid } from '../lib/id';

	let {
		label,
		value = $bindable(''),
		placeholder = '',
		hint = '',
		type = 'text'
	}: {
		label: string;
		value?: string | null | undefined;
		placeholder?: string;
		hint?: string;
		type?: string;
	} = $props();

	const id = uid('input');
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input {id} {type} value={value ?? ''} oninput={(e) => (value = (e.currentTarget as HTMLInputElement).value)} {placeholder} />
	{#if hint}<div class="hint">{hint}</div>{/if}
</div>
