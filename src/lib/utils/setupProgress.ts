export const SETUP_STEP_IDS = ['modules', 'logging', 'welcome', 'verification', 'automod', 'leveling', 'reaction-roles'] as const;

export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

const OPTIONAL_STEP_IDS = new Set<SetupStepId>(['leveling', 'reaction-roles']);

export interface DashboardSetupProgress {
	version: 1;
	completed: boolean;
	dismissed: boolean;
	promptDismissed: boolean;
	skippedSteps: SetupStepId[];
	acknowledgedSteps: SetupStepId[];
	currentStep: SetupStepId | null;
}

export const DEFAULT_DASHBOARD_SETUP_PROGRESS: DashboardSetupProgress = {
	version: 1,
	completed: false,
	dismissed: false,
	promptDismissed: false,
	skippedSteps: [],
	acknowledgedSteps: [],
	currentStep: null
};

function isStepId(value: unknown): value is SetupStepId {
	return typeof value === 'string' && (SETUP_STEP_IDS as readonly string[]).includes(value);
}

function isStepArray(value: unknown, allowed: (step: SetupStepId) => boolean): value is SetupStepId[] {
	return Array.isArray(value) && value.length <= SETUP_STEP_IDS.length && value.every(isStepId) && new Set(value).size === value.length && value.every(allowed);
}

export function validateDashboardSetupProgress(value: unknown): DashboardSetupProgress | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const input = value as Record<string, unknown>;
	const allowedKeys = ['version', 'completed', 'dismissed', 'promptDismissed', 'skippedSteps', 'acknowledgedSteps', 'currentStep'];
	if (Object.keys(input).some((key) => !allowedKeys.includes(key))) return null;
	if (input.version !== 1 || typeof input.completed !== 'boolean' || typeof input.dismissed !== 'boolean' || typeof input.promptDismissed !== 'boolean') return null;
	if (!isStepArray(input.skippedSteps, (step) => OPTIONAL_STEP_IDS.has(step))) return null;
	if (!isStepArray(input.acknowledgedSteps, () => true)) return null;
	if (input.currentStep !== null && !isStepId(input.currentStep)) return null;
	return {
		version: 1,
		completed: input.completed,
		dismissed: input.dismissed,
		promptDismissed: input.promptDismissed,
		skippedSteps: [...input.skippedSteps],
		acknowledgedSteps: [...input.acknowledgedSteps],
		currentStep: input.currentStep
	};
}

export type DashboardSetupProgressPatch = Partial<Omit<DashboardSetupProgress, 'version'>>;

export function validateDashboardSetupProgressPatch(value: unknown): DashboardSetupProgressPatch | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	let serialized: string;
	try {
		serialized = JSON.stringify(value);
	} catch {
		return null;
	}
	if (Buffer.byteLength(serialized, 'utf8') > 4096) return null;
	const input = value as Record<string, unknown>;
	const allowed = ['completed', 'dismissed', 'promptDismissed', 'skippedSteps', 'acknowledgedSteps', 'currentStep'];
	if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.includes(key))) return null;
	const patch: Record<string, unknown> = {};
	for (const key of ['completed', 'dismissed', 'promptDismissed'] as const) {
		if (key in input) {
			if (typeof input[key] !== 'boolean') return null;
			patch[key] = input[key];
		}
	}
	if ('skippedSteps' in input) {
		if (!isStepArray(input.skippedSteps, (step) => OPTIONAL_STEP_IDS.has(step))) return null;
		patch.skippedSteps = input.skippedSteps;
	}
	if ('acknowledgedSteps' in input) {
		if (!isStepArray(input.acknowledgedSteps, () => true)) return null;
		patch.acknowledgedSteps = input.acknowledgedSteps;
	}
	if ('currentStep' in input) {
		if (input.currentStep !== null && !isStepId(input.currentStep)) return null;
		patch.currentStep = input.currentStep;
	}
	return patch as DashboardSetupProgressPatch;
}
