const BOT_API_BASE = process.env.BOT_API_BASE || "http://localhost:8080/api";

type FetchInit = RequestInit & { accessToken: string };

async function request<T>(path: string, { accessToken, ...init }: FetchInit): Promise<T> {
  const res = await fetch(`${BOT_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Bot API ${res.status}`);
  }

  return (await res.json()) as T;
}

export function fetchBotGuilds(accessToken: string) {
  return request<{ guilds: any[] }>("/guilds", { accessToken, method: "GET" });
}

export function fetchBotGuild(accessToken: string, guildId: string) {
  return request<{ guild: any; settings: any }>(`/guilds/${guildId}`, {
    accessToken,
    method: "GET"
  });
}

export function fetchBotGuildSettings(accessToken: string, guildId: string) {
  return request<{ settings: any }>(`/guilds/${guildId}/settings`, {
    accessToken,
    method: "GET"
  });
}

export function updateBotGuildSettings(accessToken: string, guildId: string, payload: unknown) {
  return request<{ settings: any }>(`/guilds/${guildId}/settings`, {
    accessToken,
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchBotUser(accessToken: string) {
  return request<{ user: any }>(`/users/me`, { accessToken, method: "GET" });
}

export function updateBotUser(accessToken: string, payload: unknown) {
  return request<{ user: any }>(`/users/me`, {
    accessToken,
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

