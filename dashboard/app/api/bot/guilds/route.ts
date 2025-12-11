import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchBotGuilds } from "@/lib/bot-client";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const accessToken = (token as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchBotGuilds(accessToken);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to fetch guilds" }, { status: 500 });
  }
}

