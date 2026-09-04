import { EncryptJWT, jwtDecrypt } from 'jose';
import { createHash } from 'node:crypto';
import { dashboardConfig } from './config';

export interface DashboardSession {
	/** Discord OAuth2 access token */
	t: string;
	/** Discord OAuth2 refresh token */
	r: string;
	/** Access token expiry (ms epoch) */
	exp: number;
	/** Cached Discord user basics */
	u: { id: string; username: string; avatar: string | null };
}

function sessionKey(): Uint8Array {
	return createHash('sha256').update(dashboardConfig.session.secret, 'utf8').digest();
}

export async function sealSession(session: DashboardSession): Promise<string> {
	return new EncryptJWT({ ...session })
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.setIssuedAt()
		.encrypt(sessionKey());
}

export async function unsealSession(token: string): Promise<DashboardSession | null> {
	try {
		const { payload } = await jwtDecrypt(token, sessionKey());
		const s = payload as unknown as DashboardSession;
		if (typeof s.t !== 'string' || typeof s.exp !== 'number' || !s.u?.id) return null;
		return s;
	} catch {
		return null;
	}
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
	const parts = [
		`${dashboardConfig.session.cookieName}=${encodeURIComponent(value)}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		`Max-Age=${maxAgeSeconds}`
	];
	if (dashboardConfig.isProduction) parts.push('Secure');
	return parts.join('; ');
}

export function clearSessionCookie(): string {
	const parts = [`${dashboardConfig.session.cookieName}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
	if (dashboardConfig.isProduction) parts.push('Secure');
	return parts.join('; ');
}
