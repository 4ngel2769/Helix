<script lang="ts">
	import { onMount } from 'svelte';
	import { guildEntry } from '../../lib/session.svelte';
	import { api } from '../../lib/api';
	import type { ReactionRoleMenu } from '../../lib/types';
	import PageHeader from '../../components/PageHeader.svelte';
	import RolePill from '../../components/RolePill.svelte';
	import Select from '../../components/Select.svelte';
	import TextInput from '../../components/TextInput.svelte';
	import TextArea from '../../components/TextArea.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));

	interface RoleRow {
		roleId: string;
		label: string;
		emoji: string;
	}

	let menus = $state<ReactionRoleMenu[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let editing: string | null = $state(null);

	let messageId = $state('');
	let channelId = $state('');
	let title = $state('');
	let description = $state('');
	let maxSelections = $state('0');
	let active = $state(true);
	let roles = $state<RoleRow[]>([]);
	let busy = $state(false);
	let postViaBot = $state(true);

	const channelOptions = $derived((entry.detail?.channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })));
	const roleOptions = $derived((entry.detail?.roles ?? []).map((r) => ({ value: r.id, label: `@${r.name}` })));
	// Roles (+ Discord colors) come from the cached guild detail — no per-row fetch.
	const roleById = $derived(new Map((entry.detail?.roles ?? []).map((r) => [r.id, r])));
	function roleColor(id: string): string {
		return roleById.get(id)?.color ?? '#99aab5';
	}
	function roleName(id: string): string {
		return roleById.get(id)?.name ?? id;
	}

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			const data = await api<{ menus: ReactionRoleMenu[] }>(`/guilds/${guildId}/reaction-roles`);
			menus = data.menus;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load menus';
		} finally {
			loading = false;
		}
	}

	function resetForm(): void {
		editing = null;
		messageId = '';
		channelId = '';
		title = '';
		description = '';
		maxSelections = '0';
		active = true;
		roles = [];
		postViaBot = true;
	}

	function startEdit(menu: ReactionRoleMenu): void {
		editing = menu.messageId;
		messageId = menu.messageId;
		channelId = menu.channelId;
		title = menu.title;
		description = menu.description ?? '';
		maxSelections = String(menu.maxSelections ?? 0);
		active = menu.active !== false;
		roles = menu.roles.map((r) => ({ roleId: r.roleId, label: r.label, emoji: r.emoji ?? '' }));
		postViaBot = false;
	}

	function addRole(): void {
		roles = [...roles, { roleId: '', label: '', emoji: '' }];
	}

	async function submit(): Promise<void> {
		const trimmedId = messageId.trim();
		if (!channelId || !title.trim()) return;
		if (!editing && !postViaBot && !trimmedId) return;
		if (roles.filter((r) => r.roleId && r.label).length === 0) {
			error = 'Add at least one role with a label first.';
			return;
		}
		busy = true;
		error = null;
		notice = null;
		const body: Record<string, unknown> = {
			channelId,
			title: title.trim(),
			description: description.trim(),
			maxSelections: parseInt(maxSelections, 10) || 0,
			active,
			roles: roles.filter((r) => r.roleId && r.label).map((r) => ({ roleId: r.roleId, label: r.label, emoji: r.emoji || undefined }))
		};
		if (editing) {
			body.messageId = editing;
		} else if (postViaBot) {
			body.createMessage = true;
		} else {
			body.messageId = trimmedId;
		}
		try {
			if (editing) {
				await api(`/guilds/${guildId}/reaction-roles`, { method: 'PATCH', body });
				notice = 'Menu updated.';
			} else if (postViaBot) {
				const res = await api<{ menu: ReactionRoleMenu }>(`/guilds/${guildId}/reaction-roles`, { method: 'POST', body });
				notice = `Menu created — bot posted the message (${res.menu.messageId}).`;
			} else {
				await api(`/guilds/${guildId}/reaction-roles`, { method: 'POST', body });
				notice = 'Menu created.';
			}
			resetForm();
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			busy = false;
		}
	}

	async function remove(menu: ReactionRoleMenu): Promise<void> {
		if (!window.confirm(`Delete menu "${menu.title}"?`)) return;
		error = null;
		try {
			await api(`/guilds/${guildId}/reaction-roles`, { method: 'DELETE', query: { messageId: menu.messageId } });
			notice = 'Menu deleted.';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Delete failed';
		}
	}

	onMount(() => void load());
</script>

<PageHeader title="Reaction Roles" description="Menus stored by the bot. Let the bot post the message, or register an existing message by ID." />

{#if error}<div class="notice notice-error">{error}</div>{/if}
{#if notice}<div class="notice notice-ok">{notice}</div>{/if}

{#if loading}
	<p class="loading">Loading menus…</p>
{:else if menus.length === 0}
	<div class="empty">No menus yet — create the first one below.</div>
{:else}
	<div class="server-grid">
		{#each menus as menu (menu.messageId)}
			<div class="server-card" style="align-items: flex-start;">
				<div style="flex: 1; min-width: 0;">
					<div class="s-name">{menu.title}</div>
					<div class="s-meta mono">{menu.messageId}</div>
					<div class="small" style="margin-top: 6px;">
						{#if menu.active}<span class="tag tag-on">active</span>{:else}<span class="tag tag-off">paused</span>{/if}
						<span class="tag">{menu.roles.length} roles</span>
					</div>
					{#if menu.roles.length > 0}
						<div class="role-pill-wrap" style="margin-top: 8px;">
							{#each menu.roles as rr (rr.roleId)}
								<RolePill name={roleName(rr.roleId)} color={roleColor(rr.roleId)} size="sm" />
							{/each}
						</div>
					{/if}
				</div>
				<div class="s-actions" style="display: flex; gap: 6px;">
					<button class="btn btn-ghost btn-sm" onclick={() => startEdit(menu)}>Edit</button>
					<button class="btn btn-danger btn-sm" onclick={() => void remove(menu)}>Delete</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<div class="card">
	<div class="card-title"><h2>{editing ? 'Edit menu' : 'New menu'}</h2>{#if editing}<button class="btn btn-ghost btn-sm" onclick={resetForm}>Cancel</button>{/if}</div>
	{#if !editing}
		<label class="check-item" style="max-width: 420px; margin-bottom: 14px;">
			<input type="checkbox" bind:checked={postViaBot} /> Let the bot post the message
		</label>
	{/if}
	<div class="grid-2">
		{#if editing || !postViaBot}
			<TextInput label="Message ID" bind:value={messageId} placeholder="123456789…" hint={editing ? 'The Discord message this menu is attached to.' : 'ID of an existing bot message to attach this menu to.'} />
		{/if}
		<Select label="Channel" bind:value={channelId} options={channelOptions} allowNone={false} hint={postViaBot && !editing ? 'The bot will post the menu message here.' : ''} />
		<TextInput label="Title" bind:value={title} />
		<TextInput label="Max selections (0 = unlimited)" bind:value={maxSelections} type="number" />
	</div>
	<TextArea label="Description" bind:value={description} rows={2} />
	<label class="check-item" style="max-width: 220px; margin-bottom: 14px;">
		<input type="checkbox" bind:checked={active} /> Active
	</label>
	<div class="section-title" style="margin-top: 0;">Roles</div>
	{#each roles as role, i (i)}
		<div class="row-flex" style="margin-bottom: 10px;">
			<div style="flex: 2;">
				<div class="role-select-wrap">
					<Select label="Role" value={roles[i]!.roleId} options={roleOptions} allowNone={false} onchange={(v) => (roles[i]!.roleId = v)} />
					{#if roles[i]!.roleId}<RolePill name={roleName(roles[i]!.roleId)} color={roleColor(roles[i]!.roleId)} size="sm" />{/if}
				</div>
			</div>
			<div style="flex: 2;"><TextInput label="Label" bind:value={roles[i]!.label} /></div>
			<div style="flex: 1;"><TextInput label="Emoji" bind:value={roles[i]!.emoji} placeholder="🎮" /></div>
			<div style="flex: 0; padding-bottom: 16px;"><button class="btn btn-danger btn-sm" onclick={() => (roles = roles.filter((_, j) => j !== i))}>✕</button></div>
		</div>
	{/each}
	<div style="display: flex; gap: 10px;">
		<button class="btn btn-ghost btn-sm" onclick={addRole}>+ Add role</button>
		<button class="btn btn-primary btn-sm" disabled={busy || (!editing && !postViaBot && !messageId.trim()) || !channelId || !title.trim()} onclick={() => void submit()}>
			{busy ? 'Saving…' : editing ? 'Update menu' : postViaBot ? 'Post menu via bot' : 'Create menu'}
		</button>
	</div>
</div>
