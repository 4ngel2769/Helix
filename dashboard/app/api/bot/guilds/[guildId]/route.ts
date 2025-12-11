import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchBotGuild, updateBotGuildSettings } from "@/lib/bot-client";

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const token = await getToken({ req });
  const accessToken = (token as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchBotGuild(accessToken, params.guildId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to load guild" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { guildId: string } }) {
  const token = await getToken({ req });
  const accessToken = (token as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const result = await updateBotGuildSettings(accessToken, params.guildId, payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to update guild" }, { status: 500 });
  }
}

