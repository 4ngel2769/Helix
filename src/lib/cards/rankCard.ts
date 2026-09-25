import { createCanvas, loadImage } from 'canvas';
import { getBackground, DEFAULT_GREET_CARD } from './cardBackgrounds';
import { CARD_HEIGHT, CARD_WIDTH, fitFont, ordinal, readableTextColor } from './greetCard';
import { sanitizeText } from '../utils/sanitize';

export interface RankCardSubject {
	displayName: string;
	avatarUrl: string;
	serverName: string;
	level: number;
	totalXp: number;
	into: number;
	needed: number;
	rank: number;
}

/** Gradient-only rank card; same 900x300 footprint as the welcome cards. */
export async function renderRankCard(subject: RankCardSubject): Promise<Buffer> {
	const bg = getBackground(DEFAULT_GREET_CARD.background);
	const W = CARD_WIDTH;
	const H = CARD_HEIGHT;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext('2d');

	const grad = ctx.createLinearGradient(0, 0, W, H);
	for (const s of bg.stops) grad.addColorStop(s.at, s.color);
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, W, H);
	ctx.globalAlpha = 0.14;
	ctx.fillStyle = bg.accent;
	ctx.beginPath();
	ctx.arc(W * 0.88, H * -0.25, 240, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;

	const color = readableTextColor('#ffffff', bg.base);
	const name = sanitizeText(subject.displayName, 32) ?? 'Someone';

	// Avatar.
	const ax = 130;
	const ay = H / 2;
	const r = 78;
	try {
		const img = await loadImage(subject.avatarUrl);
		ctx.save();
		ctx.beginPath();
		ctx.arc(ax, ay, r, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(img, ax - r, ay - r, r * 2, r * 2);
		ctx.restore();
	} catch {
		ctx.fillStyle = bg.accent;
		ctx.beginPath();
		ctx.arc(ax, ay, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = color;
		ctx.font = `bold ${r}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText((name[0] ?? '?').toUpperCase(), ax, ay + 2);
	}
	ctx.save();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(ax, ay, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();

	// Text block.
	const x = 250;
	const maxW = W - x - 50;
	ctx.fillStyle = color;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';

	const nameSize = fitFont(ctx as never, name, maxW, 38);
	ctx.font = `bold ${nameSize}px sans-serif`;
	ctx.fillText(name, x, 96);

	ctx.globalAlpha = 0.82;
	ctx.font = '18px sans-serif';
	ctx.fillText(`${subject.serverName} · rank ${ordinal(subject.rank)}`, x, 124);
	ctx.globalAlpha = 1;

	ctx.font = 'bold 64px sans-serif';
	ctx.fillText(`${subject.level}`, x, 196);
	const levelW = ctx.measureText(`${subject.level}`).width;
	ctx.font = '20px sans-serif';
	ctx.globalAlpha = 0.85;
	ctx.fillText('LEVEL', x + levelW + 12, 196);
	ctx.globalAlpha = 1;

	ctx.font = '20px sans-serif';
	ctx.fillText(`${subject.totalXp.toLocaleString('en-US')} total XP`, x, 232);

	// Progress bar.
	const barW = maxW;
	const barY = 250;
	ctx.globalAlpha = 0.28;
	ctx.fillStyle = color;
	ctx.fillRect(x, barY, barW, 12);
	ctx.globalAlpha = 1;
	ctx.fillRect(x, barY, barW * Math.max(0, Math.min(1, subject.into / Math.max(1, subject.needed))), 12);
	ctx.font = '15px sans-serif';
	ctx.globalAlpha = 0.8;
	ctx.fillText(`${subject.into.toLocaleString('en-US')} / ${subject.needed.toLocaleString('en-US')} XP`, x, barY + 32);
	ctx.globalAlpha = 1;

	return canvas.toBuffer('image/png');
}

// Runnable self-check: bun -e "import { __rankCardSelfCheck } from './src/lib/cards/rankCard.ts'; __rankCardSelfCheck(); console.log('rank card ok')"
export async function __rankCardSelfCheck(): Promise<void> {
	const png = await renderRankCard({
		displayName: 'Self Check',
		avatarUrl: '',
		serverName: 'Test Guild',
		level: 7,
		totalXp: 2450,
		into: 150,
		needed: 700,
		rank: 3
	});
	if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('rank card is not a PNG');
	if (png.length < 1000) throw new Error('rank card looks empty');
}
