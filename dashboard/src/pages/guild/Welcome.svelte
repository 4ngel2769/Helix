<script lang="ts">
	import { guildEntry, saveGuildConfig } from '../../lib/session.svelte';
	import { apiBlob } from '../../lib/api';
	import PageHeader from '../../components/PageHeader.svelte';
	import SearchPicker from '../../components/SearchPicker.svelte';
	import DiscordPreview from '../../components/DiscordPreview.svelte';
	import TextArea from '../../components/TextArea.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import Toggle from '../../components/Toggle.svelte';
	import SaveBar from '../../components/SaveBar.svelte';

	// Mirror of src/lib/cards/cardBackgrounds.ts — keep keys/stops in sync there.
	// `file` backgrounds are served by the bot at /api/bot/cards/<key>.
	const BACKGROUNDS = [
		{ key: 'midnight', label: 'Midnight', premium: false, base: '#1a1b2e', accent: '#3b66ff', from: '#1a1b2e', to: '#3b3f7a' },
		{ key: 'ocean', label: 'Ocean', premium: false, base: '#062a3a', accent: '#22d3ee', from: '#062a3a', to: '#0e7490' },
		{ key: 'sunset', label: 'Sunset', premium: false, base: '#3a1c2e', accent: '#fb923c', from: '#3a1c2e', to: '#c2410c' },
		{ key: 'forest', label: 'Forest', premium: false, base: '#0d2b1d', accent: '#4ade80', from: '#0d2b1d', to: '#166534' },
		{ key: 'nebula', label: 'Nebula', premium: false, base: '#2e1065', accent: '#e879f9', from: '#2e1065', to: '#86198f' },
		{ key: 'gold', label: 'Royal Gold', premium: false, base: '#292004', accent: '#facc15', from: '#292004', to: '#a16207' },
		{ key: 'crimson', label: 'Crimson', premium: false, base: '#2a0a0a', accent: '#f87171', from: '#2a0a0a', to: '#991b1b' },
		{ key: 'mono', label: 'Mono Light', premium: false, base: '#e8e8ec', accent: '#6366f1', from: '#f4f4f6', to: '#c7c9d4' },
		{ key: 'card1', label: 'Card 1', premium: true, file: 'card1.png', base: '#14532d', accent: '#4ade80', from: '#14532d', to: '#22c55e' },
		{ key: 'card2', label: 'Card 2', premium: true, file: 'card2.png', base: '#1e3a8a', accent: '#a3e635', from: '#1e3a8a', to: '#0ea5e9' },
		{ key: 'card3', label: 'Card 3', premium: true, file: 'card3.png', base: '#155e75', accent: '#fb923c', from: '#155e75', to: '#f59e0b' },
		{ key: 'card4', label: 'Card 4', premium: true, file: 'card4.png', base: '#3b0764', accent: '#e879f9', from: '#3b0764', to: '#a21caf' }
	];
	const LAYOUTS = [
		{ key: 'left', label: 'Avatar left' },
		{ key: 'center', label: 'Centered' },
		{ key: 'right', label: 'Avatar right' }
	];
	const COLOR_PRESETS = ['#ffffff', '#111111', '#ffd817', '#22d3ee', '#fb923c', '#f87171', '#4ade80', '#e879f9'];

	interface CardState {
		enabled: boolean;
		background: string;
		layout: string;
		showName: boolean;
		line1: string;
		line1Enabled: boolean;
		line2: string;
		line2Enabled: boolean;
		textColor: string;
	}

	const DEFAULT_CARD: CardState = {
		enabled: false,
		background: 'midnight',
		layout: 'left',
		showName: true,
		line1: 'User {{user.name}} is the {{server.ordinal}} member!',
		line2: 'Welcome to {{server.name}}',
		line1Enabled: true,
		line2Enabled: true,
		textColor: '#ffffff'
	};

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));
	const isPremium = $derived(entry.config?.isPremium === true);
	const serverName = $derived(entry.detail?.name ?? 'Your Server');

	let welcomeChannelId = $state('');
	let welcomeMessage = $state('');
	let farewellChannelId = $state('');
	let farewellMessage = $state('');
	let welcomeCard = $state<CardState>({ ...DEFAULT_CARD });
	let farewellCard = $state<CardState>({ ...DEFAULT_CARD, line1: 'Goodbye {{user.name}}!', line2: '{{user.name}} has left {{server.name}}' });
	let baseline = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const str = (v: unknown): string => (typeof v === 'string' ? v : '');

	function cardFromCache(v: unknown, fallback: CardState): CardState {
		const r = (typeof v === 'object' && v !== null ? v : {}) as Partial<CardState>;
		return {
			enabled: r.enabled === true,
			background: typeof r.background === 'string' ? r.background : fallback.background,
			layout: r.layout === 'center' || r.layout === 'right' ? r.layout : 'left',
			showName: r.showName !== false,
			line1: typeof r.line1 === 'string' ? r.line1 : fallback.line1,
			line1Enabled: r.line1Enabled !== false,
			line2: typeof r.line2 === 'string' ? r.line2 : fallback.line2,
			line2Enabled: r.line2Enabled !== false,
			textColor: typeof r.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(r.textColor) ? r.textColor : fallback.textColor
		};
	}

	function syncFromCache(): void {
		welcomeChannelId = str(entry.config?.welcomeChannelId);
		welcomeMessage = str(entry.config?.welcomeMessage);
		farewellChannelId = str(entry.config?.farewellChannelId);
		farewellMessage = str(entry.config?.farewellMessage);
		welcomeCard = cardFromCache(entry.config?.welcomeCard, DEFAULT_CARD);
		farewellCard = cardFromCache(entry.config?.farewellCard, { ...DEFAULT_CARD, line1: 'Goodbye {{user.name}}!', line2: '{{user.name}} has left {{server.name}}' });
		baseline = snapshot();
		saved = false;
	}

	function snapshot(): string {
		return JSON.stringify({ welcomeChannelId, welcomeMessage, farewellChannelId, farewellMessage, welcomeCard, farewellCard });
	}

	const DEFAULT_WELCOME = 'Welcome {{user.mention}} to **{{server.name}}**! You are member #{{server.members}}.';
	const DEFAULT_FAREWELL = '**{{user.name}}** has left {{server.name}}.';

	function useDefaultWelcome(): void {
		saved = false;
		welcomeMessage = DEFAULT_WELCOME;
	}

	function useDefaultFarewell(): void {
		saved = false;
		farewellMessage = DEFAULT_FAREWELL;
	}

	$effect(() => {
		if (entry.config && baseline === '') syncFromCache();
	});

	const dirty = $derived(baseline !== '' && snapshot() !== baseline);
	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}`, kind: 'channel' as const })));

	function bgOf(card: CardState) {
		return BACKGROUNDS.find((b) => b.key === card.background) ?? BACKGROUNDS[0]!;
	}

	// Live bot-rendered card PNGs (debounced; object URLs revoked on replace).
	let welcomePng = $state('');
	let farewellPng = $state('');
	let previewSeq = 0;

	async function fetchCardPng(card: CardState, slot: 'welcome' | 'farewell', seq: number): Promise<void> {
		if (!card.enabled) {
			if (slot === 'welcome' && welcomePng) URL.revokeObjectURL(welcomePng);
			if (slot === 'farewell' && farewellPng) URL.revokeObjectURL(farewellPng);
			if (slot === 'welcome') welcomePng = '';
			else farewellPng = '';
			return;
		}
		try {
			const blob = await apiBlob(`/cards/preview`, {
				method: 'POST',
				body: { guildId, card: { ...card } }
			});
			if (seq !== previewSeq) return; // stale response
			const url = URL.createObjectURL(blob);
			if (slot === 'welcome') {
				if (welcomePng) URL.revokeObjectURL(welcomePng);
				welcomePng = url;
			} else {
				if (farewellPng) URL.revokeObjectURL(farewellPng);
				farewellPng = url;
			}
		} catch {
			// keep previous preview; save errors surface via SaveBar
		}
	}

	$effect(() => {
		const w = JSON.stringify(welcomeCard);
		const f = JSON.stringify(farewellCard);
		if (baseline === '') return;
		const seq = ++previewSeq;
		const t = setTimeout(() => {
			void fetchCardPng(JSON.parse(w), 'welcome', seq);
			void fetchCardPng(JSON.parse(f), 'farewell', seq);
		}, 700);
		return () => clearTimeout(t);
	});

	function luminance(hex: string): number {
		const c = hex.replace('#', '');
		const rgb = [0, 2, 4].map((i) => {
			const v = parseInt(c.slice(i, i + 2), 16) / 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
	}

	function contrast(a: string, b: string): number {
		const l1 = luminance(a);
		const l2 = luminance(b);
		return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
	}

	function contrastOk(card: CardState): boolean {
		return contrast(card.textColor, bgOf(card).base) >= 3;
	}

	function renderSample(template: string): string {
		return template
			.replaceAll('{{user.name}}', 'Alex')
			.replaceAll('{{user.tag}}', 'alex')
			.replaceAll('{{user.mention}}', '@Alex')
			.replaceAll('{{server.name}}', serverName)
			.replaceAll('{{server.members}}', '42')
			.replaceAll('{{server.ordinal}}', '42nd')
			.replaceAll('{{prefix}}', 'x');
	}

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const nil = (v: string): string | null => (v === '' ? null : v);
			await saveGuildConfig(guildId, {
				welcomeChannelId: nil(welcomeChannelId),
				welcomeMessage: nil(welcomeMessage),
				farewellChannelId: nil(farewellChannelId),
				farewellMessage: nil(farewellMessage),
				welcomeCard: { ...welcomeCard },
				farewellCard: { ...farewellCard }
			});
			baseline = snapshot();
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="Welcome" description="Greet arrivals and say goodbye to leavers. Empty channel disables the message." />

<div class="notice notice-info">
	<strong>Placeholders you can use:</strong>
	<code>&#123;&#123;user.mention&#125;&#125;</code> pings the user, <code>&#123;&#123;user.name&#125;&#125;</code> is their display name,
	<code>&#123;&#123;user.tag&#125;&#125;</code> is their username, <code>&#123;&#123;prefix&#125;&#125;</code> is this server's prefix,
	<code>&#123;&#123;server.name&#125;&#125;</code> is the server name, <code>&#123;&#123;server.members&#125;&#125;</code> is the current member count,
	<code>&#123;&#123;server.ordinal&#125;&#125;</code> is the count as 1st/2nd/3rd.
	Leave the message empty to use the built-in default.
</div>

<div class="card">
	<div class="card-title"><h2>Welcome</h2><button class="btn btn-ghost btn-sm" onclick={useDefaultWelcome}>Use default</button></div>
	<SearchPicker label="Welcome channel" bind:value={welcomeChannelId} options={channelOptions} />
	<TextArea label="Welcome message" bind:value={welcomeMessage} maxlength={2000} hint="Supports user/prefix/server placeholders (see box above). Empty = default." />
</div>

<div class="card">
	<div class="card-title"><h2>Welcome image card</h2><span class="tag">{welcomeCard.enabled ? 'on' : 'off'}</span></div>
	<Toggle title="Attach an image card" description="Posted to the welcome channel under the text message." checked={welcomeCard.enabled} onchange={(v) => { welcomeCard.enabled = v; saved = false; }} />
	{#if welcomeCard.enabled}
		<div class="section-title">Background {#if !isPremium}<span class="tag">🔒 more with premium</span>{/if}</div>
		<div class="bg-grid">
			{#each BACKGROUNDS as b (b.key)}
				<button
					type="button"
					class="bg-pick {welcomeCard.background === b.key ? 'sel' : ''}"
					style="{'file' in b ? `background-image: url(/api/bot/cards/${b.key}); background-size: cover; background-position: center;` : `background: linear-gradient(135deg, ${b.from}, ${b.to});`}"
					disabled={b.premium && !isPremium}
					title={b.premium && !isPremium ? `${b.label} (premium)` : b.label}
					onclick={() => { welcomeCard.background = b.key; welcomeCard.textColor = b.key === 'mono' ? '#111111' : '#ffffff'; saved = false; }}
				>{b.premium && !isPremium ? '🔒' : b.label}</button>
			{/each}
		</div>
		<div class="section-title">Layout</div>
		<div class="seg">
			{#each LAYOUTS as l (l.key)}
				<button type="button" class={welcomeCard.layout === l.key ? 'sel' : ''} onclick={() => { welcomeCard.layout = l.key; saved = false; }}>{l.label}</button>
			{/each}
		</div>
		<div class="grid-2">
			<Toggle title="Member display name" description="Big name line." checked={welcomeCard.showName} onchange={(v) => { welcomeCard.showName = v; saved = false; }} />
			<div>
				<div class="section-title">Text color</div>
				<div class="swatches">
					{#each COLOR_PRESETS as c (c)}
						<button type="button" class="sw {welcomeCard.textColor.toLowerCase() === c ? 'sel' : ''}" style="background: {c};" title={c} onclick={() => { welcomeCard.textColor = c; saved = false; }}></button>
					{/each}
					<input type="color" value={welcomeCard.textColor} oninput={(e) => { welcomeCard.textColor = (e.currentTarget as HTMLInputElement).value; saved = false; }} title="Custom color" />
				</div>
				{#if !contrastOk(welcomeCard)}<div class="hint warn">Low contrast on this background — the bot will fall back to a readable color.</div>{/if}
			</div>
		</div>
		<Toggle title="Text line 1" description="Default: User Alex is the 42nd member!" checked={welcomeCard.line1Enabled} onchange={(v) => { welcomeCard.line1Enabled = v; saved = false; }} />
		{#if welcomeCard.line1Enabled}<TextInput label="Line 1" bind:value={welcomeCard.line1} maxlength={140} />{/if}
		<Toggle title="Text line 2 (smaller)" description="Default: Welcome to your server" checked={welcomeCard.line2Enabled} onchange={(v) => { welcomeCard.line2Enabled = v; saved = false; }} />
		{#if welcomeCard.line2Enabled}<TextInput label="Line 2" bind:value={welcomeCard.line2} maxlength={140} />{/if}
		<div class="section-title">Preview — the whole message</div>
		<DiscordPreview
			botName="Helix"
			avatarUrl={entry.detail?.botAvatar ?? ''}
			content={renderSample(welcomeMessage || DEFAULT_WELCOME)}
			imageUrl={welcomePng}
		/>
	{/if}
</div>

<div class="card">
	<div class="card-title"><h2>Farewell</h2><button class="btn btn-ghost btn-sm" onclick={useDefaultFarewell}>Use default</button></div>
	<SearchPicker label="Farewell channel" bind:value={farewellChannelId} options={channelOptions} />
	<TextArea label="Farewell message" bind:value={farewellMessage} maxlength={2000} hint="Supports user/prefix/server placeholders (see box above). Empty = default." />
</div>

<div class="card">
	<div class="card-title"><h2>Farewell image card</h2><span class="tag">{farewellCard.enabled ? 'on' : 'off'}</span></div>
	<Toggle title="Attach an image card" description="Posted to the farewell channel under the text message." checked={farewellCard.enabled} onchange={(v) => { farewellCard.enabled = v; saved = false; }} />
	{#if farewellCard.enabled}
		<div class="section-title">Background {#if !isPremium}<span class="tag">🔒 more with premium</span>{/if}</div>
		<div class="bg-grid">
			{#each BACKGROUNDS as b (b.key)}
				<button
					type="button"
					class="bg-pick {farewellCard.background === b.key ? 'sel' : ''}"
					style="{'file' in b ? `background-image: url(/api/bot/cards/${b.key}); background-size: cover; background-position: center;` : `background: linear-gradient(135deg, ${b.from}, ${b.to});`}"
					disabled={b.premium && !isPremium}
					title={b.premium && !isPremium ? `${b.label} (premium)` : b.label}
					onclick={() => { farewellCard.background = b.key; farewellCard.textColor = b.key === 'mono' ? '#111111' : '#ffffff'; saved = false; }}
				>{b.premium && !isPremium ? '🔒' : b.label}</button>
			{/each}
		</div>
		<div class="section-title">Layout</div>
		<div class="seg">
			{#each LAYOUTS as l (l.key)}
				<button type="button" class={farewellCard.layout === l.key ? 'sel' : ''} onclick={() => { farewellCard.layout = l.key; saved = false; }}>{l.label}</button>
			{/each}
		</div>
		<div class="grid-2">
			<Toggle title="Member display name" description="Big name line." checked={farewellCard.showName} onchange={(v) => { farewellCard.showName = v; saved = false; }} />
			<div>
				<div class="section-title">Text color</div>
				<div class="swatches">
					{#each COLOR_PRESETS as c (c)}
						<button type="button" class="sw {farewellCard.textColor.toLowerCase() === c ? 'sel' : ''}" style="background: {c};" title={c} onclick={() => { farewellCard.textColor = c; saved = false; }}></button>
					{/each}
					<input type="color" value={farewellCard.textColor} oninput={(e) => { farewellCard.textColor = (e.currentTarget as HTMLInputElement).value; saved = false; }} title="Custom color" />
				</div>
				{#if !contrastOk(farewellCard)}<div class="hint warn">Low contrast on this background — the bot will fall back to a readable color.</div>{/if}
			</div>
		</div>
		<Toggle title="Text line 1" description="Default: Goodbye Alex!" checked={farewellCard.line1Enabled} onchange={(v) => { farewellCard.line1Enabled = v; saved = false; }} />
		{#if farewellCard.line1Enabled}<TextInput label="Line 1" bind:value={farewellCard.line1} maxlength={140} />{/if}
		<Toggle title="Text line 2 (smaller)" description="Default: Alex has left your server" checked={farewellCard.line2Enabled} onchange={(v) => { farewellCard.line2Enabled = v; saved = false; }} />
		{#if farewellCard.line2Enabled}<TextInput label="Line 2" bind:value={farewellCard.line2} maxlength={140} />{/if}
		<div class="section-title">Preview — the whole message</div>
		<DiscordPreview
			botName="Helix"
			avatarUrl={entry.detail?.botAvatar ?? ''}
			content={renderSample(farewellMessage || DEFAULT_FAREWELL)}
			imageUrl={farewellPng}
		/>
	{/if}
</div>

<SaveBar {dirty} {saving} {error} {saved} onsave={() => void save()} onreset={syncFromCache} />

<style>
	.bg-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
		margin-bottom: 12px;
	}
	.bg-pick {
		border: 2px solid transparent;
		border-radius: 8px;
		padding: 14px 8px;
		color: #fff;
		font-weight: 600;
		font-size: 12px;
		cursor: pointer;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}
	.bg-pick.sel {
		border-color: var(--accent, #3b66ff);
	}
	.bg-pick:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.seg {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}
	.seg button {
		flex: 1;
		border: 1px solid var(--border, #2a2d34);
		background: var(--bg-soft);
		color: inherit;
		border-radius: 8px;
		padding: 8px;
		cursor: pointer;
	}
	.seg button.sel {
		border-color: var(--accent, #3b66ff);
	}
	.swatches {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.sw {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.sw.sel {
		border-color: var(--accent, #3b66ff);
	}
	.warn {
		color: #f0a832;
	}
</style>
