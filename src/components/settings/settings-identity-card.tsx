"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  PILL_SECONDARY_INLINE,
  GHOST_LINK,
} from "@/components/app/pills";
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
    <section className="border-b border-black/[0.08] py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <UserAvatar
          displayName={displayName}
          avatarR2Key={avatarR2Key}
          className="size-20 shrink-0 sm:size-24"
          fallbackClassName="bg-[#0d0d0d] text-2xl text-white"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
              Identity
            </p>
            <h2 className="mt-2 text-2xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
              {displayName}
            </h2>
            <p className="mt-1 text-sm text-[#0d0d0d]/55">
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
            <button
              type="button"
              className={`${PILL_SECONDARY_INLINE} h-10 px-4 text-xs`}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              {avatarR2Key ? "Change photo" : "Upload photo"}
            </button>
            {avatarR2Key ? (
              <button
                type="button"
                className={`${GHOST_LINK} rounded-full px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-black/25`}
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                {removing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
