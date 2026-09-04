<script lang="ts">
	let {
		dirty,
		saving,
		error = null,
		saved = false,
		onsave,
		onreset
	}: {
		dirty: boolean;
		saving: boolean;
		error?: string | null;
		saved?: boolean;
		onsave: () => void;
		onreset: () => void;
	} = $props();
</script>

{#if error}
	<div class="notice notice-error">{error}</div>
{/if}
{#if saved && !dirty}
	<div class="notice notice-ok">Saved.</div>
{/if}
<div class="savebar">
	<span class="muted small">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</span>
	<span style="flex: 1"></span>
	<button class="btn btn-ghost btn-sm" disabled={!dirty || saving} onclick={onreset}>Reset</button>
	<button class="btn btn-primary btn-sm" disabled={!dirty || saving} onclick={onsave}>
		{saving ? 'Saving…' : 'Save changes'}
	</button>
</div>
