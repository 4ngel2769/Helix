import type { DashboardSetupProgress, ReactionRoleMenu } from './types';

export const SETUP_STEPS = [
	{ id: 'modules', label: 'Modules', required: true, section: 'modules' },
	{ id: 'logging', label: 'Logging', required: true, section: 'logging' },
	{ id: 'welcome', label: 'Welcome & farewell', required: true, section: 'welcome' },
	{ id: 'verification', label: 'Verification', required: true, section: 'verification' },
	{ id: 'automod', label: 'AutoMod', required: true, section: 'automod' },
	{ id: 'leveling', label: 'Leveling', required: false, section: 'leveling' },
	{ id: 'reaction-roles', label: 'Reaction Roles', required: false, section: 'reaction-roles' }
] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number]['id'];
export type SetupStepStatus = 'needs-attention' | 'configured' | 'skipped';
export type SetupProgressView = Partial<Pick<DashboardSetupProgress, 'acknowledgedSteps' | 'skippedSteps'>>;

export function deriveSetupStepStatuses(
	config: Record<string, unknown> | null,
	menus: ReactionRoleMenu[] | null,
	progress?: SetupProgressView | null
): Record<SetupStepId, SetupStepStatus> {
	const cfg = config ?? {};
	const modules = (cfg.modules && typeof cfg.modules === 'object' ? cfg.modules : {}) as Record<string, unknown>;
	const moduleSettings = Object.values(modules);
	const statuses: Record<SetupStepId, SetupStepStatus> = {
		modules: moduleSettings.some((value) => typeof value === 'boolean') ? 'configured' : 'needs-attention',
		logging: hasText(cfg.logChannelId) || hasEnabledEvent(cfg.logEvents) ? 'configured' : 'needs-attention',
		welcome: hasText(cfg.welcomeChannelId) || hasText(cfg.farewellChannelId) ? 'configured' : 'needs-attention',
		verification: hasText(cfg.verificationChannelId) || progress?.acknowledgedSteps?.includes('verification') ? 'configured' : 'needs-attention',
		automod: hasAutomod(cfg.automodSettings, cfg.automodKeywords) ? 'configured' : 'needs-attention',
		leveling: modules.leveling === false || progress?.skippedSteps?.includes('leveling') ? 'skipped' : hasLeveling(cfg.leveling) ? 'configured' : 'needs-attention',
		'reaction-roles': menus === null ? 'needs-attention' : menus.length > 0 ? 'configured' : progress?.skippedSteps?.includes('reaction-roles') ? 'skipped' : 'needs-attention'
	};
	return statuses;
}

export function nextSetupStep(statuses: Record<SetupStepId, SetupStepStatus>, currentStep: SetupStepId | null): SetupStepId {
	if (currentStep && statuses[currentStep] === 'needs-attention') return currentStep;
	return SETUP_STEPS.find((step) => step.required && statuses[step.id] === 'needs-attention')?.id
		?? SETUP_STEPS.find((step) => statuses[step.id] === 'needs-attention')?.id
		?? 'leveling';
}

function hasText(value: unknown): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasEnabledEvent(value: unknown): boolean {
	return Boolean(value && typeof value === 'object' && Object.values(value).some((item) => item === true));
}

function hasAutomod(settings: unknown, keywords: unknown): boolean {
	if (settings && typeof settings === 'object') {
		const value = settings as Record<string, unknown>;
		if (Object.values(value).some((item) => item === true)) return true;
		if (value.filters && typeof value.filters === 'object' && Object.values(value.filters).some((item) => item === true)) return true;
	}
	return Boolean(keywords && typeof keywords === 'object' && Object.values(keywords).some((list) => Array.isArray(list) && list.length > 0));
}

function hasLeveling(value: unknown): boolean {
	if (!value || typeof value !== 'object') return false;
	return Object.values(value).some((item) => item === true || (typeof item === 'number' && item > 0) || (typeof item === 'string' && item.trim() !== ''));
}
