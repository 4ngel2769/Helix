import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type DashboardGuild = {
  id: string;
  name: string;
  iconUrl?: string;
  manageable: boolean;
  hasBot: boolean;
  owner?: boolean;
};

export function GuildCard({ guild }: { guild: DashboardGuild }) {
  const initials = guild.name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar>
          <AvatarImage src={guild.iconUrl} alt={guild.name} />
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <CardTitle className="text-lg">{guild.name}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {guild.hasBot ? <Badge variant="success">Bot Installed</Badge> : <Badge variant="warning">Bot Missing</Badge>}
            {guild.manageable ? <Badge variant="secondary">Manageable</Badge> : <Badge variant="outline">View Only</Badge>}
            {guild.owner && <Badge variant="outline">Owner</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Manage Helix settings for this server. Prefix, modules, verification, and automod can be edited if you have Manage
        Guild permissions.
      </CardContent>
      <CardFooter className="justify-end">
        <Button asChild variant={guild.manageable ? "default" : "outline"} disabled={!guild.manageable}>
          <Link href={`/dashboard/${guild.id}`}>{guild.manageable ? "Open" : "View only"}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

