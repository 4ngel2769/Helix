import { redirect } from "next/navigation";
import { GuildCard, type DashboardGuild } from "@/components/guild-card";
import { UserProfileCard } from "@/components/user-profile-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardData() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const guildsUrl = new URL("/api/bot/guilds", base).toString();
  const userUrl = new URL("/api/bot/users/me", base).toString();

  const [guildRes, userRes] = await Promise.all([
    fetch(guildsUrl, { cache: "no-store", credentials: "include" }),
    fetch(userUrl, { cache: "no-store", credentials: "include" })
  ]);

  if (guildRes.status === 401) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const guildJson = guildRes.ok ? await guildRes.json() : { guilds: [] };
  const userJson = userRes.ok ? await userRes.json() : {};

  return {
    guilds: (guildJson.guilds ?? []) as DashboardGuild[],
    user: (userJson.user as any) ?? null
  };
}

export default async function DashboardPage() {
  const { guilds, user } = await getDashboardData();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Signed in with Discord</p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
        </div>
        <form action="/api/auth/signout" method="post">
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <UserProfileCard
          initialBio={user?.bio}
          initialDisplayName={user?.displayName}
          initialPronouns={user?.pronouns}
        />

        <Card>
          <CardHeader>
            <CardTitle>Your Discord</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>ID: {user?.id ?? "unknown"}</div>
            <div>
              Username: {user ? `${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ""}` : "unknown"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your servers</h2>
          <p className="text-sm text-muted-foreground">Manage guilds where you have Manage Guild or Administrator.</p>
        </div>
        {guilds.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No guilds found. Ensure you granted the "guilds" scope to Helix.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guilds.map((guild) => (
              <GuildCard key={guild.id} guild={guild} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

