"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Check,
  Copy,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUserDate, type AdminUserRow } from "@/lib/admin-users";
import {
  deleteUserAccount,
  resendMagicLink,
  setUserBanned,
} from "@/app/(app)/admin/users/actions";
import { cn } from "@/lib/utils";

type Dialog = "none" | "resend" | "ban" | "delete";

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "neutral" | "alert" | "brand";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-[3px] border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider",
        tone === "alert" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "neutral" && "border-border bg-secondary text-muted-foreground",
        tone === "ok" && "border-primary/35 bg-primary/10 text-primary",
        tone === "brand" && "border-foreground/30 bg-foreground/10 text-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function UserRow({
  user,
  isSelf,
}: {
  user: AdminUserRow;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>("none");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Ban and delete are blocked for your own account and any admin account.
  const protectedTarget = isSelf || user.isAdmin;

  function close() {
    if (pending) return;
    setDialog("none");
    setConfirmEmail("");
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  function runResend() {
    startTransition(async () => {
      const res = await resendMagicLink(user.email ?? "");
      if (res.ok) {
        toast.success(`Sign-in link sent to ${user.email}.`);
        close();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  }

  function runBan() {
    startTransition(async () => {
      const res = await setUserBanned(user.id, !user.banned);
      if (res.ok) {
        toast.success(user.banned ? "User unbanned." : "User banned.");
        close();
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  }

  function runDelete() {
    startTransition(async () => {
      const res = await deleteUserAccount(user.id, confirmEmail);
      if (res.ok) {
        toast.success("Account deleted.");
        close();
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  }

  const emailMatches =
    !!user.email && confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <div className="rounded-[4px] border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{user.email ?? "—"}</span>
            {isSelf && <Badge tone="brand">You</Badge>}
            {user.isAdmin && (
              <Badge tone="brand">
                <ShieldCheck className="mr-0.5 inline size-2.5" />
                Admin
              </Badge>
            )}
            {user.banned && (
              <Badge tone="alert">
                <Ban className="mr-0.5 inline size-2.5" />
                Banned
              </Badge>
            )}
            {user.emailConfirmed ? (
              <Badge tone="ok">Confirmed</Badge>
            ) : (
              <Badge tone="neutral">Unconfirmed</Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={copyId}
                className="inline-flex items-center gap-1 font-mono transition hover:text-foreground"
                title="Copy user ID"
              >
                {copied ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3" />
                )}
                {user.id}
              </button>
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{user.methodLabel}</span>
            <span>Joined {formatUserDate(user.createdAt)}</span>
            <span>
              Last sign-in{" "}
              {user.lastSignInAt ? formatUserDate(user.lastSignInAt) : "never"}
            </span>
            <span>
              {user.notesCount} {user.notesCount === 1 ? "note" : "notes"}
            </span>
            <span>
              {user.recordingsCount}{" "}
              {user.recordingsCount === 1 ? "recording" : "recordings"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setDialog("resend")}
            disabled={pending || !user.email}
          >
            <Mail />
            Magic link
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setDialog("ban")}
            disabled={pending || protectedTarget}
            title={protectedTarget ? "Protected account" : undefined}
          >
            {user.banned ? <Undo2 /> : <Ban />}
            {user.banned ? "Unban" : "Ban"}
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setDialog("delete")}
            disabled={pending || protectedTarget}
            title={protectedTarget ? "Protected account" : undefined}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      {dialog !== "none" && (
        <ConfirmPanel
          dialog={dialog}
          user={user}
          pending={pending}
          confirmEmail={confirmEmail}
          setConfirmEmail={setConfirmEmail}
          emailMatches={emailMatches}
          onCancel={close}
          onConfirm={
            dialog === "resend" ? runResend : dialog === "ban" ? runBan : runDelete
          }
        />
      )}
    </div>
  );
}

function ConfirmPanel({
  dialog,
  user,
  pending,
  confirmEmail,
  setConfirmEmail,
  emailMatches,
  onCancel,
  onConfirm,
}: {
  dialog: Exclude<Dialog, "none">;
  user: AdminUserRow;
  pending: boolean;
  confirmEmail: string;
  setConfirmEmail: (v: string) => void;
  emailMatches: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = dialog === "delete";
  const confirmDisabled = pending || (isDelete && !emailMatches);

  return (
    <div
      className={cn(
        "mt-4 rounded-[4px] border p-4",
        isDelete ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary/40"
      )}
    >
      <div className="flex items-start gap-2">
        {isDelete && (
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        )}
        <div className="min-w-0 flex-1">
          {dialog === "resend" && (
            <p className="text-sm text-pretty">
              Email a fresh sign-in link to <strong>{user.email}</strong>?
            </p>
          )}
          {dialog === "ban" && (
            <p className="text-sm text-pretty">
              {user.banned ? (
                <>
                  Unban <strong>{user.email}</strong>? They&apos;ll be able to
                  sign in again.
                </>
              ) : (
                <>
                  Ban <strong>{user.email}</strong>? They won&apos;t be able to
                  sign in until you unban them.
                </>
              )}
            </p>
          )}
          {isDelete && (
            <>
              <p className="text-sm text-pretty">
                Permanently delete <strong>{user.email}</strong> and purge all
                their notes, recordings and stored audio. This cannot be undone.
              </p>
              <label className="mt-3 block text-xs font-medium text-muted-foreground">
                Type the email to confirm
              </label>
              <Input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email ?? ""}
                autoComplete="off"
                className="mt-1.5 max-w-sm"
                disabled={pending}
              />
            </>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant={isDelete ? "destructive" : "default"}
              size="sm"
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {pending && <Loader2 className="animate-spin" />}
              {dialog === "resend" && "Send link"}
              {dialog === "ban" && (user.banned ? "Unban user" : "Ban user")}
              {isDelete && "Delete account"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
