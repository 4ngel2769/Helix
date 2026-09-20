<script lang="ts">
	let {
		name,
		size = 'md'
	}: {
		name: string;
		size?: 'sm' | 'md';
	} = $props();
</script>

<span class="channel-pill {size}"><span class="channel-hash">#</span><span class="channel-name">{name}</span></span>
