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
{#if dirty}
	<div class="savebar" role="region" aria-label="Pending changes">
		<span class="muted small" role="status" aria-live="polite">Changes are pending.</span>
		<span class="savebar-spacer"></span>
		<button class="btn btn-discard btn-sm" disabled={saving} onclick={onreset}>Discard</button>
		<button class="btn btn-apply btn-sm" disabled={saving} onclick={onsave}>
			{saving ? 'Applying…' : 'Apply'}
		</button>
	</div>
{:else}
	<div class="savebar-placeholder" aria-hidden="true"></div>
{/if}
