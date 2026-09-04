<script lang="ts">
	let {
		title,
		description = '',
		checked = $bindable(false),
		onchange = undefined
	}: {
		title: string;
		description?: string;
		checked?: boolean;
		onchange?: (value: boolean) => void;
	} = $props();

	function flip(): void {
		checked = !checked;
		onchange?.(checked);
	}
</script>

<div class="toggle-row">
	<div>
		<div class="t-title">{title}</div>
		{#if description}<div class="t-desc">{description}</div>{/if}
	</div>
	<button type="button" class="toggle" role="switch" aria-checked={checked} aria-label={title} onclick={flip}></button>
</div>
