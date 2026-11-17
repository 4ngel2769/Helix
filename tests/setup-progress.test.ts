import { describe, expect, it } from 'bun:test';
import { DEFAULT_DASHBOARD_SETUP_PROGRESS, validateDashboardSetupProgress, validateDashboardSetupProgressPatch } from '../src/lib/utils/setupProgress';

describe('dashboard setup progress validation', () => {
	it('provides a clean versioned initial state', () => {
		expect(DEFAULT_DASHBOARD_SETUP_PROGRESS).toEqual({ version: 1, completed: false, dismissed: false, promptDismissed: false, skippedSteps: [], acknowledgedSteps: [], currentStep: null });
	});

	it('accepts only known optional skips and known acknowledgements', () => {
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, skippedSteps: ['leveling'], acknowledgedSteps: ['verification'], currentStep: 'automod' })).not.toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, skippedSteps: ['modules'] })).toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, skippedSteps: ['unknown'] })).toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, acknowledgedSteps: ['unknown'] })).toBeNull();
	});

	it('rejects malformed versions, duplicate IDs, unknown keys, and oversized objects', () => {
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, version: 2 })).toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, skippedSteps: ['leveling', 'leveling'] })).toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, extra: true })).toBeNull();
		expect(validateDashboardSetupProgress({ ...DEFAULT_DASHBOARD_SETUP_PROGRESS, skippedSteps: Array(100).fill('leveling') })).toBeNull();
	});

	it('rejects patches containing unknown fields instead of partially applying them', () => {
		expect(validateDashboardSetupProgressPatch({ completed: true, surprise: 'ignored' })).toBeNull();
		expect(validateDashboardSetupProgressPatch({ completed: true })).toEqual({ completed: true });
	});
});
