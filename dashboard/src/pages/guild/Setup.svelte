<script lang="ts">
	import { guildEntry, saveSetupProgress } from '../../lib/session.svelte';
	import { navigate } from '../../lib/router.svelte';
	import { deriveSetupStepStatuses, SETUP_STEPS, type SetupStepId } from '../../lib/setup';
	import { api } from '../../lib/api';
	import PageHeader from '../../components/PageHeader.svelte';

	let { guildId }: { guildId: string } = $props();
	const entry = $derived(guildEntry(guildId));
	let menus = $state<import('../../lib/types').ReactionRoleMenu[] | null>(null);
	const statuses = $derived(deriveSetupStepStatuses(entry.config, menus, entry.setupProgress));
	const progress = $derived(entry.setupProgress);
	let saving = $state(false);
	let error = $state<string | null>(null);
	const currentStep = $derived(progress?.currentStep ?? 'modules');
	const activeIndex = $derived(SETUP_STEPS.findIndex((step) => step.id === currentStep));
	const active = $derived(SETUP_STEPS[Math.max(activeIndex, 0)]!);
	const routeFor: Record<SetupStepId, string> = {
		modules: 'modules', logging: 'logging', welcome: 'welcome', verification: 'verification', automod: 'automod', leveling: 'leveling', 'reaction-roles': 'reaction-roles'
	};
	$effect(() => {
		let cancelled = false;
		void api<{ menus: import('../../lib/types').ReactionRoleMenu[] }>(`/guilds/${guildId}/reaction-roles`)
			.then((result) => { if (!cancelled) menus = result.menus; })
			.catch(() => { if (!cancelled) menus = null; });
		return () => { cancelled = true; };
	});

	async function update(patch: Parameters<typeof saveSetupProgress>[1]): Promise<boolean> {
		saving = true;
		error = null;
		try { await saveSetupProgress(guildId, patch); return true; }
		catch (e) { error = e instanceof Error ? e.message : 'Could not save setup progress'; return false; }
		finally { saving = false; }
	}
	async function selectStep(step: SetupStepId): Promise<void> { if (await update({ currentStep: step })) return; }
	async function next(): Promise<void> {
		if (active.id === 'verification' && statuses.verification !== 'configured' && !progress?.acknowledgedSteps.includes('verification')) return;
		if (active.id === 'automod' && statuses.automod !== 'configured') return;
		const following = SETUP_STEPS[activeIndex + 1];
		if (following) await update({ currentStep: following.id });
		else if (await update({ completed: true, currentStep: null })) navigate(`/panel/guilds/${guildId}/dashboard`);
	}
	async function skipOptional(): Promise<void> {
		if (active.required) return;
		const skippedSteps = [...new Set([...(progress?.skippedSteps ?? []), active.id])];
		const following = SETUP_STEPS[activeIndex + 1];
		await update({ skippedSteps, currentStep: following?.id ?? null, ...(following ? {} : { completed: true }) });
	}
	async function acknowledgeVerification(): Promise<void> {
		const acknowledgedSteps = [...new Set([...(progress?.acknowledgedSteps ?? []), 'verification' as const])];
		await update({ acknowledgedSteps, currentStep: 'automod' });
	}
</script>

<PageHeader title="Server setup" description="A guided checklist for the essentials. Feature settings remain editable in their existing pages." />
{#if entry.setupProgressError}<div class="notice notice-error">Setup progress could not be loaded: {entry.setupProgressError}. Your settings pages are still available.</div>{/if}
{#if error}<div class="notice notice-error">{error}</div>{/if}
<div class="setup-layout">
	<nav class="setup-steps" aria-label="Setup steps">
		{#each SETUP_STEPS as step (step.id)}
			<button class:active={step.id === currentStep} class="setup-step" onclick={() => selectStep(step.id)}>
				<span class="setup-step-number">{statuses[step.id] === 'configured' ? '✓' : step.required ? '•' : '○'}</span>
				<span>{step.label}<small>{statuses[step.id] === 'configured' ? 'Configured' : statuses[step.id] === 'skipped' ? 'Skipped' : 'Needs attention'}</small></span>
			</button>
		{/each}
	</nav>
	<section class="card setup-content" aria-live="polite">
		<div class="setup-kicker">STEP {activeIndex + 1} OF {SETUP_STEPS.length}{active.required ? ' · ESSENTIAL' : ' · OPTIONAL'}</div>
		<h2>{active.label}</h2>
		<p class="card-desc">{#if statuses[active.id] === 'configured'}This step is configured based on your server’s current settings.{:else}Review this setting in its existing dashboard page. The wizard will not change it for you.{/if}</p>
		<div class="setup-actions">
			<a class="btn btn-primary" href={`/panel/guilds/${guildId}/${routeFor[active.id]}`}>Open {active.label} settings</a>
			{#if active.id === 'verification' && statuses.verification !== 'configured'}
				<button class="btn btn-ghost" disabled={saving} onclick={acknowledgeVerification}>Leave verification disabled</button>
			{:else if active.id === 'verification'}
				<button class="btn btn-ghost" disabled={saving} onclick={next}>Continue</button>
			{:else if active.id === 'automod' && statuses.automod !== 'configured'}
				<p class="small muted">Enable and tune AutoMod in settings. The wizard will not activate filters or punitive actions.</p>
			{:else}
				<button class="btn btn-ghost" disabled={saving || statuses[active.id] !== 'configured'} onclick={next}>Continue</button>
			{/if}
			{#if !active.required}<button class="btn btn-ghost" disabled={saving} onclick={skipOptional}>Skip optional step</button>{/if}
		</div>
		<div class="setup-footer">
			{#if activeIndex > 0}<button class="btn btn-ghost btn-sm" disabled={saving} onclick={() => selectStep(SETUP_STEPS[activeIndex - 1]!.id)}>Back</button>{/if}
			<button class="btn btn-ghost btn-sm" disabled={saving} onclick={async () => { if (await update({ dismissed: true, currentStep: active.id })) navigate(`/panel/guilds/${guildId}/dashboard`); }}>Exit setup</button>
			{#if statuses.modules === 'configured' && statuses.logging === 'configured' && statuses.welcome === 'configured' && statuses.verification === 'configured' && statuses.automod === 'configured'}
				<button class="btn btn-primary btn-sm" disabled={saving} onclick={async () => { if (await update({ completed: true, currentStep: null })) navigate(`/panel/guilds/${guildId}/dashboard`); }}>Finish setup</button>
			{/if}
		</div>
	</section>
</div>
