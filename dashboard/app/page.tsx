import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Secure Discord Auth",
    description: "Login with Discord without exposing tokens to the browser.",
    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
  },
  {
    title: "Guild Controls",
    description: "Manage prefixes, modules, verification, and automod per guild.",
    icon: <Users className="h-5 w-5 text-primary" />,
  },
  {
    title: "Shadcn UI",
    description: "Fast, accessible dashboard built with shadcn/ui components.",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16">
      <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Secure Helix Control Panel
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Configure Helix without leaving your browser.
          </h1>
          <p className="text-lg text-muted-foreground">
            Sign in with Discord, pick your guild, and adjust everything from prefixes to verification and modules. No bot tokens or secrets ever touch the client.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/api/auth/signin?callbackUrl=/dashboard">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="https://discord.com/oauth2/authorize" target="_blank" rel="noreferrer">
                Invite Helix
              </Link>
            </Button>
          </div>
        </div>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">What you can do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="rounded-full bg-primary/10 p-2">{feature.icon}</div>
                <div>
                  <div className="font-medium">{feature.title}</div>
                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

