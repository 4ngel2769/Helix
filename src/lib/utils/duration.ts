import { Duration } from '@sapphire/time-utilities';

/**
 * "10m", "1h", "30s" -> ms. Returns 0 for anything unparseable.
 * Bare numbers mean minutes (Discord convention), which `Duration` does not
 * assume, so the fallback is applied here rather than in the parser.
 *
 * ponytail: one unit (no weeks/days), no "2d" style. Add a unit table if
 * someone ever needs >24h granularity here.
 */
export function parseDuration(input: string | null): number {
	if (!input) return 0;
	const trimmed = input.trim();
	const withUnit = /[a-z]/i.test(trimmed) ? trimmed : `${trimmed}m`;
	const offset = new Duration(withUnit).offset;
	return Number.isNaN(offset) || offset < 0 ? 0 : offset;
}

export function __durationSelfCheck(): void {
	const cases: Array<[string | null, number]> = [
		['10m', 600_000],
		['1h', 3_600_000],
		['30s', 30_000],
		['2 hrs', 7_200_000],
		['90', 5_400_000],
		['5', 300_000],
		['abc', 0],
		['', 0],
		[null, 0]
	];
	for (const [input, want] of cases) {
		const got = parseDuration(input);
		if (got !== want) throw new Error(`parseDuration(${JSON.stringify(input)}) = ${got}, want ${want}`);
	}
}
