import { createCanvas, loadImage } from 'canvas';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getBackground } from './cardBackgrounds';
import type { GreetCardConfig } from './cardBackgrounds';
import { renderMessageTemplate, type TemplateContext } from '../utils/messagePlaceholders';
import { sanitizeText } from '../utils/sanitize';

export const CARD_WIDTH = 900;
export const CARD_HEIGHT = 300;

/** Resolve a bundled background file (works from src/ and dist/ layouts). */
export function resolveCardAsset(file: string): string | null {
	const base = file.replace(/[/\\]/g, '').replace(/^\.+/, '');
	if (!/^card[0-9]+\.png$/i.test(base)) return null; // never serve arbitrary paths
	const candidates = [
		join(process.cwd(), 'src', 'db', 'assets', 'cards', base),
		join(__dirname, '..', '..', '..', 'src', 'db', 'assets', 'cards', base)
	];
	for (const p of candidates) {
		try {
			if (existsSync(p)) return p;
		} catch {
			// try next
		}
	}
	return null;
}

/** 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 11-13 -> th … */
export function ordinal(n: number): string {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
	switch (n % 10) {
		case 1:
			return `${n}st`;
		case 2:
			return `${n}nd`;
		case 3:
			return `${n}rd`;
		default:
			return `${n}th`;
	}
}

function luminance(hex: string): number {
	const c = hex.replace('#', '');
	const rgb = [0, 2, 4].map((i) => {
		const v = parseInt(c.slice(i, i + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
	const l1 = luminance(a);
	const l2 = luminance(b);
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Client + server share this: warn/fallback when text is unreadable on the bg. */
export function readableTextColor(want: string, bgBase: string): string {
	if (/^#[0-9a-f]{6}$/i.test(want) && contrastRatio(want, bgBase) >= 3) return want;
	return contrastRatio('#ffffff', bgBase) >= contrastRatio('#111111', bgBase) ? '#ffffff' : '#111111';
}

export interface GreetCardSubject {
	displayName: string;
	avatarUrl: string;
	memberCount: number;
	serverName: string;
	prefix: string;
	userTag: string;
}

function fitFont(ctx: { font: string; measureText: (t: string) => { width: number } }, text: string, maxWidth: number, start: number): number {
	let size = start;
	ctx.font = `${size}px sans-serif`;
	while (size > 12 && ctx.measureText(text).width > maxWidth) {
		size -= 2;
		ctx.font = `${size}px sans-serif`;
	}
	return size;
}

export async function renderGreetCard(card: GreetCardConfig, subject: GreetCardSubject): Promise<Buffer> {
	const bg = getBackground(card.background);
	const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
	const ctx = canvas.getContext('2d');

	// Background: file art (cover-fit) when available, else procedural gradient.
	let painted = false;
	if (bg.file) {
		const asset = resolveCardAsset(bg.file);
		if (asset) {
			try {
				const img = await loadImage(asset);
				const scale = Math.max(CARD_WIDTH / img.width, CARD_HEIGHT / img.height);
				const w = img.width * scale;
				const h = img.height * scale;
				ctx.drawImage(img, (CARD_WIDTH - w) / 2, (CARD_HEIGHT - h) / 2, w, h);
				// Soft scrim so text stays readable on busy art.
				ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
				ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
				painted = true;
			} catch {
				painted = false;
			}
		}
	}
	if (!painted) {
		const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
		for (const s of bg.stops) grad.addColorStop(s.at, s.color);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
		ctx.globalAlpha = 0.12;
		ctx.fillStyle = bg.accent;
		ctx.beginPath();
		ctx.arc(CARD_WIDTH * 0.85, CARD_HEIGHT * -0.2, 220, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(CARD_WIDTH * 0.08, CARD_HEIGHT * 1.15, 260, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	const color = readableTextColor(card.textColor, bg.base);
	const name = sanitizeText(subject.displayName, 32) ?? 'Someone';
	const templateCtx: TemplateContext = {
		userMention: `@${name}`,
		userName: name,
		userTag: subject.userTag,
		prefix: subject.prefix,
		serverName: subject.serverName,
		serverMembers: subject.memberCount,
		serverOrdinal: ordinal(subject.memberCount)
	};
	const line1 = card.line1Enabled ? (sanitizeText(renderMessageTemplate(card.line1 || '', templateCtx), 140) ?? '') : '';
	const line2 = card.line2Enabled ? (sanitizeText(renderMessageTemplate(card.line2 || '', templateCtx), 140) ?? '') : '';

	// Avatar (circular, white ring). Falls back to initial letter on load failure.
	const AV = 160;
	const positions = {
		left: { ax: 150, textX: 270, align: 'left' as const },
		right: { ax: CARD_WIDTH - 150, textX: CARD_WIDTH - 270, align: 'right' as const },
		center: { ax: CARD_WIDTH / 2, textX: CARD_WIDTH / 2, align: 'center' as const }
	};
	const pos = positions[card.layout] ?? positions.left;
	const avatarY = card.layout === 'center' ? 105 : CARD_HEIGHT / 2;
	const avatarR = card.layout === 'center' ? 62 : AV / 2;

	try {
		const img = await loadImage(subject.avatarUrl);
		ctx.save();
		ctx.beginPath();
		ctx.arc(pos.ax, avatarY, avatarR, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(img, pos.ax - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
		ctx.restore();
	} catch {
		ctx.save();
		ctx.fillStyle = bg.accent;
		ctx.beginPath();
		ctx.arc(pos.ax, avatarY, avatarR, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = color;
		ctx.font = `bold ${Math.floor(avatarR)}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText((name[0] ?? '?').toUpperCase(), pos.ax, avatarY + 2);
		ctx.restore();
	}
	ctx.save();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(pos.ax, avatarY, avatarR, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();

	// Text block.
	const maxW = card.layout === 'center' ? CARD_WIDTH - 120 : CARD_WIDTH - 340;
	ctx.fillStyle = color;
	ctx.textBaseline = 'alphabetic';
	let y = card.layout === 'center' ? 210 : CARD_HEIGHT / 2 - 30;
	ctx.textAlign = pos.align;
	if (card.showName) {
		const size = fitFont(ctx as never, name, maxW, 46);
		ctx.font = `bold ${size}px sans-serif`;
		ctx.fillText(name, pos.textX, y);
		y += size + 12;
	}
	if (line1) {
		const size = fitFont(ctx as never, line1, maxW, 28);
		ctx.font = `${size}px sans-serif`;
		ctx.fillText(line1, pos.textX, y);
		y += size + 10;
	}
	if (line2) {
		const size = fitFont(ctx as never, line2, maxW, 21);
		ctx.globalAlpha = 0.85;
		ctx.font = `${size}px sans-serif`;
		ctx.fillText(line2, pos.textX, y);
		ctx.globalAlpha = 1;
	}

	return canvas.toBuffer('image/png');
}
