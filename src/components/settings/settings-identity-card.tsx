"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

export function SettingsIdentityCard({
  displayName,
  joined,
  avatarR2Key,
}: {
  displayName: string;
  joined: string | null;
  avatarR2Key?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const busy = uploading || removing;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Couldn't upload that image.");
      }
      toast.success("Profile picture updated.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't upload that image."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Couldn't remove your profile picture.");
      }
      toast.success("Profile picture removed.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't remove your profile picture."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="mt-8 overflow-hidden rounded-[4px] border border-border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="h-2 bg-primary/20" aria-hidden />

      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <UserAvatar
          displayName={displayName}
          avatarR2Key={avatarR2Key}
          className="size-20 shrink-0 sm:size-24"
          fallbackClassName="bg-primary text-2xl text-primary-foreground"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {displayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {joined ? `Atlas member since ${joined}` : "Atlas member"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              {avatarR2Key ? "Change photo" : "Upload photo"}
            </Button>
            {avatarR2Key ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                {removing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
