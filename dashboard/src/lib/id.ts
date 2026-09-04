let counter = 0;

/** Tiny unique-id helper for associating <label> elements with controls. */
export function uid(prefix = 'field'): string {
	counter += 1;
	return `${prefix}-${counter}`;
}
