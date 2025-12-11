"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  initialBio?: string | null;
  initialDisplayName?: string | null;
  initialPronouns?: string | null;
};

export function UserProfileCard({ initialBio, initialDisplayName, initialPronouns }: Props) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [pronouns, setPronouns] = useState(initialPronouns ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    setStatus(null);
    startTransition(async () => {
      const res = await fetch("/api/bot/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, displayName, pronouns })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus(body?.error || "Failed to save profile");
        return;
      }

      setStatus("Profile updated");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should Helix call you?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pronouns">Pronouns</Label>
          <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Add a short bio to show up in Helix profiles."
            maxLength={240}
          />
          <div className="text-right text-xs text-muted-foreground">{bio.length}/240</div>
        </div>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save profile"}
        </Button>
      </CardFooter>
    </Card>
  );
}

