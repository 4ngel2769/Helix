// Minimal history-mode router. Routes are matched as literal segments with
// `:param` placeholders, e.g. `/guild/:guildId/dashboard`.

export interface MatchedRoute {
	pattern: string;
	params: Record<string, string>;
}

let currentPath = $state(window.location.pathname);

window.addEventListener('popstate', () => {
	currentPath = window.location.pathname;
});

export function path(): string {
	return currentPath;
}

export function navigate(to: string): void {
	if (to === currentPath) return;
	window.history.pushState(null, '', to);
	currentPath = to;
	window.scrollTo({ top: 0 });
}

export function match(pattern: string): Record<string, string> | null {
	const pathSegs = currentPath.split('/').filter(Boolean);
	const patSegs = pattern.split('/').filter(Boolean);
	if (pathSegs.length !== patSegs.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < patSegs.length; i += 1) {
		const pat = patSegs[i]!;
		const seg = pathSegs[i]!;
		if (pat.startsWith(':')) params[pat.slice(1)] = decodeURIComponent(seg);
		else if (pat !== seg) return null;
	}
	return params;
}

export function linkProps(to: string): { href: string; onclick: (event: MouseEvent) => void } {
	return {
		href: to,
		onclick: (event: MouseEvent) => {
			// Allow open-in-new-tab etc.
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
			event.preventDefault();
			navigate(to);
		}
	};
}
