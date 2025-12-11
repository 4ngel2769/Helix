import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchBotUser, updateBotUser } from "@/lib/bot-client";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const accessToken = (token as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchBotUser(accessToken);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  const accessToken = (token as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const data = await updateBotUser(accessToken, payload);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to update user" }, { status: 500 });
  }
}

