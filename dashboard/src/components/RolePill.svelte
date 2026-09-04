<script lang="ts">
	let {
		name,
		color = '#99aab5',
		size = 'md'
	}: {
		name: string;
		color?: string | null;
		size?: 'sm' | 'md';
	} = $props();

	// Discord sends '#000000' when a role has no color — fall back to neutral.
	const dot = $derived(color && color !== '#000000' ? color : '#99aab5');
</script>

<span class="role-pill {size}" style="--role-color: {dot};">
	<span class="role-dot"></span>
	<span class="role-name">{name}</span>
</span>
