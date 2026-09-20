<script lang="ts">
	import { uid } from '../lib/id';

	let {
		label,
		value = $bindable(''),
		placeholder = '',
		hint = '',
		rows = 4,
		maxlength
	}: {
		label: string;
		value?: string | null | undefined;
		placeholder?: string;
		hint?: string;
		rows?: number;
		maxlength?: number;
	} = $props();

	const id = uid('textarea');
</script>

<div class="field">
	<label for={id}>{label}</label>
	<textarea {id} value={value ?? ''} oninput={(e) => (value = (e.currentTarget as HTMLTextAreaElement).value)} {placeholder} {rows} maxlength={maxlength}></textarea>
	{#if hint}<div class="hint">{hint}</div>{/if}
	{#if maxlength}<div class="hint">{(value ?? '').length}/{maxlength}</div>{/if}
</div>
