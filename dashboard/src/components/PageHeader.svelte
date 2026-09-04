<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		children
	}: {
		title: string;
		description?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="page-head">
	<div>
		<h1>{title}</h1>
		{#if description}<p>{description}</p>{/if}
	</div>
	<div>
		{#if children}{@render children()}{/if}
	</div>
</div>
