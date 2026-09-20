<script lang="ts">
	export interface PreviewButton {
		label: string;
		style?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
		emoji?: string;
	}

	export interface PreviewSelect {
		placeholder?: string;
		options?: Array<{ label: string; emoji?: string }>;
		disabled?: boolean;
	}

	let {
		botName = 'Helix',
		avatarUrl = '',
		content = '',
		title = '',
		description = '',
		footer = '',
		thumbUrl = '',
		embedColor = '#3b66ff',
		imageUrl = '',
		buttons = [],
		select
	}: {
		botName?: string;
		avatarUrl?: string;
		content?: string;
		title?: string;
		description?: string;
		footer?: string;
		thumbUrl?: string;
		embedColor?: string;
		imageUrl?: string;
		buttons?: PreviewButton[];
		select?: PreviewSelect;
	} = $props();

	const initial = $derived((botName.trim()[0] ?? 'H').toUpperCase());
	const showAvatar = $derived(/^https?:\/\/.+\..+/.test(avatarUrl.trim()));
	const showThumb = $derived(/^https?:\/\/.+\..+/.test(thumbUrl.trim()));
	const showEmbed = $derived(title.trim() !== '' || description.trim() !== '' || footer.trim() !== '' || showThumb);

	function rowsOf(btns: PreviewButton[]): PreviewButton[][] {
		const rows: PreviewButton[][] = [];
		for (let i = 0; i < btns.length; i += 5) rows.push(btns.slice(i, i + 5));
		return rows.slice(0, 5);
	}
</script>

<div class="dc-msg">
	{#if showAvatar}<img class="dc-avatar-img" src={avatarUrl.trim()} alt="" />{:else}<div class="dc-avatar">{initial}</div>{/if}
	<div class="dc-body">
		<div class="dc-head">
			<span class="dc-name">{botName}</span>
			<span class="dc-bot">APP</span>
			<span class="dc-time">Today at {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
		</div>
		{#if content.trim() !== ''}<div class="dc-content">{content}</div>{/if}
		{#if imageUrl.trim() !== ''}<img class="dc-attach" src={imageUrl} alt="card preview" />{/if}
		{#if showEmbed}
			<div class="dc-embed" style="--embed-color: {embedColor};">
				<div class="dc-embed-main">
					{#if title.trim() !== ''}<div class="dc-embed-title">{title}</div>{/if}
					{#if description.trim() !== ''}<div class="dc-embed-desc">{description}</div>{/if}
					{#if footer.trim() !== ''}<div class="dc-embed-footer">{footer}</div>{/if}
				</div>
				{#if showThumb}<img class="dc-embed-thumb" src={thumbUrl.trim()} alt="" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />{/if}
			</div>
		{/if}
		{#each rowsOf(buttons) as row (row.map((b) => b.label).join('|'))}
			<div class="dc-row">
				{#each row as b (b.label)}
					<span class="dc-btn {b.style ?? 'secondary'}">{#if b.emoji}<span class="dc-btn-emoji">{b.emoji}</span>{/if}{b.label || ' '}</span>
				{/each}
			</div>
		{/each}
		{#if select}
			<div class="dc-select {select.disabled ? 'disabled' : ''}">
				<span class="dc-select-ph">{select.placeholder || 'Select roles...'}</span>
				<span class="dc-select-chev">▾</span>
			</div>
			{#if (select.options ?? []).length > 0}
				<div class="dc-select-opts">
					{#each (select.options ?? []).slice(0, 6) as o (o.label)}
						<div class="dc-select-opt">{#if o.emoji}<span class="dc-btn-emoji">{o.emoji}</span>{/if}{o.label}</div>
					{/each}
					{#if (select.options ?? []).length > 6}<div class="dc-select-opt dim">+{(select.options ?? []).length - 6} more…</div>{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.dc-msg {
		display: flex;
		gap: 12px;
		background: #313338;
		border-radius: 8px;
		padding: 12px 14px;
		color: #dbdee1;
		font-size: 14px;
	}
	.dc-avatar {
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 50%;
		background: #5865f2;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 18px;
	}
	.dc-avatar-img {
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: #5865f2;
	}
	.dc-attach {
		display: block;
		max-width: 400px;
		width: 100%;
		border-radius: 8px;
		margin-top: 6px;
	}
	.dc-body {
		flex: 1;
		min-width: 0;
	}
	.dc-head {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dc-name {
		color: #fff;
		font-weight: 600;
	}
	.dc-bot {
		background: #5865f2;
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		border-radius: 4px;
		padding: 1px 5px;
	}
	.dc-time {
		color: #949ba4;
		font-size: 11px;
	}
	.dc-content {
		margin-top: 2px;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.dc-embed {
		display: flex;
		gap: 12px;
		background: #2b2d31;
		border-left: 4px solid var(--embed-color, #3b66ff);
		border-radius: 4px;
		padding: 10px 12px;
		margin-top: 6px;
		max-width: 520px;
	}
	.dc-embed-main {
		flex: 1;
		min-width: 0;
	}
	.dc-embed-title {
		color: #fff;
		font-weight: 700;
		margin-bottom: 4px;
		word-break: break-word;
	}
	.dc-embed-desc {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.dc-embed-footer {
		color: #b5bac1;
		font-size: 12px;
		margin-top: 8px;
		word-break: break-word;
	}
	.dc-embed-thumb {
		width: 80px;
		height: 80px;
		flex: none;
		border-radius: 8px;
		object-fit: cover;
	}
	.dc-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}
	.dc-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border-radius: 4px;
		padding: 7px 16px;
		font-size: 14px;
		font-weight: 500;
		color: #fff;
	}
	.dc-btn-emoji {
		font-size: 16px;
	}
	.dc-btn.primary {
		background: #5865f2;
	}
	.dc-btn.secondary {
		background: #4e5058;
	}
	.dc-btn.success {
		background: #248046;
	}
	.dc-btn.danger {
		background: #da373c;
	}
	.dc-btn.link {
		background: transparent;
		color: #00a8fc;
	}
	.dc-select {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #2b2d31;
		border: 1px solid #1e1f22;
		border-radius: 4px;
		padding: 9px 12px;
		margin-top: 8px;
		max-width: 520px;
		color: #b5bac1;
	}
	.dc-select.disabled {
		opacity: 0.5;
	}
	.dc-select-chev {
		color: #b5bac1;
	}
	.dc-select-opts {
		background: #2b2d31;
		border: 1px solid #1e1f22;
		border-top: none;
		border-radius: 0 0 4px 4px;
		margin-top: -2px;
		max-width: 520px;
		overflow: hidden;
	}
	.dc-select-opt {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		color: #dbdee1;
	}
	.dc-select-opt.dim {
		color: #949ba4;
		font-size: 12px;
	}
</style>
