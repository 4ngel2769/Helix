import { notFound, redirect } from "next/navigation";
import { GuildSettingsForm } from "@/components/guild-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getGuildData(guildId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL(`/api/bot/guilds/${guildId}`, base).toString();
  const res = await fetch(url, { cache: "no-store", credentials: "include" });

  if (res.status === 401) {
    redirect(`/api/auth/signin?callbackUrl=/dashboard/${guildId}`);
  }

  if (res.status === 404) {
    notFound();
  }

  const json = await res.json();
  return json;
}

export default async function GuildPage({ params }: { params: { guildId: string } }) {
  const data = await getGuildData(params.guildId);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Guild ID: {params.guildId}</p>
        <h1 className="text-3xl font-semibold">{data.guild?.name ?? "Guild"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guild overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Bot installed:</span> {data.guild?.hasBot ? "Yes" : "No"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Manageable:</span> {data.guild?.manageable ? "Yes" : "No (view only)"}
          </div>
        </CardContent>
      </Card>

      <GuildSettingsForm
        guildId={params.guildId}
        initialSettings={data.settings ?? {}}
        manageable={Boolean(data.guild?.manageable)}
      />
    </main>
  );
}

