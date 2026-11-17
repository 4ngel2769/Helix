import { describe, expect, it } from 'bun:test';
import { deriveSetupStepStatuses, nextSetupStep, SETUP_STEPS } from './setup';

describe('setup step status', () => {
	it('keeps an unconfigured guild incomplete and optional features skippable', () => {
		const statuses = deriveSetupStepStatuses({}, []);
		expect(SETUP_STEPS.map((step) => step.id)).toEqual(['modules', 'logging', 'welcome', 'verification', 'automod', 'leveling', 'reaction-roles']);
		expect(statuses.modules).toBe('needs-attention');
		expect(statuses.verification).toBe('needs-attention');
		expect(statuses.leveling).toBe('needs-attention');
		expect(statuses['reaction-roles']).toBe('needs-attention');
	});

	it('derives configured status from persisted settings and explicit verification acknowledgement', () => {
		const config = {
			modules: { welcoming: true, verification: true, moderation: true, leveling: false },
			logChannelId: '123',
			welcomeChannelId: '456',
			farewellChannelId: '456',
			automodSettings: { filters: { invites: true } }
		};
		const statuses = deriveSetupStepStatuses(config, [], { acknowledgedSteps: ['verification'] });
		expect(statuses.modules).toBe('configured');
		expect(statuses.logging).toBe('configured');
		expect(statuses.welcome).toBe('configured');
		expect(statuses.verification).toBe('configured');
		expect(statuses.automod).toBe('configured');
	});

	it('counts an existing reaction role menu as configured', () => {
		expect(deriveSetupStepStatuses({}, [{ messageId: 'm', channelId: 'c', title: 'Roles', description: '', roles: [], maxSelections: 1, active: true }])['reaction-roles']).toBe('configured');
	});

	it('does not call a loaded empty menu list unknown, while null represents not-yet-loaded', () => {
		expect(deriveSetupStepStatuses({}, null)['reaction-roles']).toBe('needs-attention');
		expect(deriveSetupStepStatuses({}, [])['reaction-roles']).toBe('needs-attention');
	});

	it('selects the first essential incomplete step before optional work', () => {
		const statuses = deriveSetupStepStatuses({ modules: { moderation: true }, logChannelId: '123', welcomeChannelId: '456' }, []);
		expect(nextSetupStep(statuses, null)).toBe('verification');
	});

	it('marks disabled leveling skipped but enabled leveling without settings incomplete', () => {
		expect(deriveSetupStepStatuses({ modules: { leveling: false } }, []).leveling).toBe('skipped');
		expect(deriveSetupStepStatuses({ modules: { leveling: true } }, []).leveling).toBe('needs-attention');
	});
});
