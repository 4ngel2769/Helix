<script lang="ts">
	import { navigate, path } from '../lib/router.svelte';

	let { to, label }: { to: string; label: string } = $props();

	function go(event: MouseEvent): void {
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
		event.preventDefault();
		navigate(to);
	}
</script>

<a href={to} onclick={go} class="nav-link" class:active={path() === to}>{label}</a>
