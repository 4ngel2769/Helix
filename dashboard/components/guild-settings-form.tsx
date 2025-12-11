"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type GuildSettings = {
  prefix?: string;
  adminRoleId?: string | null;
  modRoleId?: string | null;
  modules?: Record<string, boolean>;
  verification?: {
    channelId?: string | null;
    roleId?: string | null;
    message?: string | null;
    disabledMessage?: string | null;
    title?: string | null;
    footer?: string | null;
    thumbnail?: string | null;
  };
  automodKeywords?: {
    profanity?: string[];
    scams?: string[];
    phishing?: string[];
    custom?: string[];
  };
};

type Props = {
  guildId: string;
  initialSettings: GuildSettings;
  manageable: boolean;
};

export function GuildSettingsForm({ guildId, initialSettings, manageable }: Props) {
  const [settings, setSettings] = useState<GuildSettings>(initialSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const moduleEntries = useMemo(
    () => Object.entries(settings.modules ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    [settings.modules]
  );

  const handleModuleToggle = (key: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      modules: {
        ...(prev.modules ?? {}),
        [key]: value
      }
    }));
  };

  const handleAutomodChange = (field: keyof NonNullable<GuildSettings["automodKeywords"]>, value: string) => {
    setSettings((prev) => ({
      ...prev,
      automodKeywords: {
        ...(prev.automodKeywords ?? {}),
        [field]: value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      }
    }));
  };

  const save = () => {
    setStatus(null);
    startTransition(async () => {
      const res = await fetch(`/api/bot/guilds/${guildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus(body?.error || "Failed to save settings");
        return;
      }

      setStatus("Settings saved");
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prefix & roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              maxLength={5}
              value={settings.prefix ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, prefix: e.target.value }))}
              disabled={!manageable}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminRoleId">Admin role ID</Label>
              <Input
                id="adminRoleId"
                value={settings.adminRoleId ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, adminRoleId: e.target.value }))}
                placeholder="Role ID with admin powers"
                disabled={!manageable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modRoleId">Moderator role ID</Label>
              <Input
                id="modRoleId"
                value={settings.modRoleId ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, modRoleId: e.target.value }))}
                placeholder="Role ID with mod powers"
                disabled={!manageable}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {moduleEntries.length === 0 && <Badge variant="outline" className="text-muted-foreground">No modules configured</Badge>}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {moduleEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium capitalize">{key}</span>
                  <span className="text-xs text-muted-foreground">{value ? "Enabled" : "Disabled"}</span>
                </div>
                <Switch checked={value} onCheckedChange={(checked) => handleModuleToggle(key, checked)} disabled={!manageable} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="verificationMessage">Verification message</Label>
            <Textarea
              id="verificationMessage"
              value={settings.verification?.message ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  verification: { ...(prev.verification ?? {}), message: e.target.value }
                }))
              }
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationDisabled">Disabled message</Label>
            <Textarea
              id="verificationDisabled"
              value={settings.verification?.disabledMessage ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  verification: { ...(prev.verification ?? {}), disabledMessage: e.target.value }
                }))
              }
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationChannel">Verification channel ID</Label>
            <Input
              id="verificationChannel"
              value={settings.verification?.channelId ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  verification: { ...(prev.verification ?? {}), channelId: e.target.value }
                }))
              }
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationRole">Verification role ID</Label>
            <Input
              id="verificationRole"
              value={settings.verification?.roleId ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  verification: { ...(prev.verification ?? {}), roleId: e.target.value }
                }))
              }
              disabled={!manageable}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AutoMod keywords</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profanity">Profanity</Label>
            <Input
              id="profanity"
              value={(settings.automodKeywords?.profanity ?? []).join(", ")}
              onChange={(e) => handleAutomodChange("profanity", e.target.value)}
              placeholder="word1, word2"
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phishing">Phishing</Label>
            <Input
              id="phishing"
              value={(settings.automodKeywords?.phishing ?? []).join(", ")}
              onChange={(e) => handleAutomodChange("phishing", e.target.value)}
              placeholder="domain1, domain2"
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scams">Scams</Label>
            <Input
              id="scams"
              value={(settings.automodKeywords?.scams ?? []).join(", ")}
              onChange={(e) => handleAutomodChange("scams", e.target.value)}
              placeholder="scam site, fake link"
              disabled={!manageable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom">Custom</Label>
            <Input
              id="custom"
              value={(settings.automodKeywords?.custom ?? []).join(", ")}
              onChange={(e) => handleAutomodChange("custom", e.target.value)}
              placeholder="comma separated keywords"
              disabled={!manageable}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Manageable: {manageable ? "yes" : "no"} — changes require Manage Guild permissions.
          {status && <div className="mt-2 text-foreground">{status}</div>}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={save} disabled={isPending || !manageable}>
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

