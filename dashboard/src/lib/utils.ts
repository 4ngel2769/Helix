import { navigate } from './router.svelte';

export function guildIcon(url: string | null, name: string, size = 56): string {
	if (url) return url;
	const initial = (name.trim()[0] ?? '?').toUpperCase();
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#232c3a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${Math.floor(size / 2.4)}" font-weight="700" fill="#eef2f7">${initial}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function go(to: string): (event: MouseEvent) => void {
	return (event: MouseEvent) => {
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
		event.preventDefault();
		navigate(to);
	};
}

export function formatCount(n: number | undefined): string {
	if (n === undefined || n === null) return '—';
	return n.toLocaleString('en-US');
}
