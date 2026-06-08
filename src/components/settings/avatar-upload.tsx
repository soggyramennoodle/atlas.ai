"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

export function AvatarUpload({
  displayName,
  avatarR2Key,
}: {
  displayName: string;
  avatarR2Key?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't upload that image.");
      }
      toast.success("Profile picture updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload that image.");
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
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't remove your profile picture.");
      }
      toast.success("Profile picture removed.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove your profile picture."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar
        displayName={displayName}
        avatarR2Key={avatarR2Key}
        className="size-18 sm:size-20"
        fallbackClassName="bg-primary text-2xl text-primary-foreground"
      />
      <div className="flex flex-wrap gap-2">
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
          className="gap-2"
          disabled={uploading || removing}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {avatarR2Key ? "Change photo" : "Upload photo"}
        </Button>
        {avatarR2Key ? (
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            disabled={uploading || removing}
            onClick={() => void handleRemove()}
          >
            {removing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
