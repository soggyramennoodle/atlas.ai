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
import {
  ADMIN_BADGE,
  ADMIN_BTN,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PRIMARY,
  ADMIN_INPUT,
  CARD,
  cn,
} from "@/components/admin/admin-kit";
import { formatUserDate, type AdminUserRow } from "@/lib/admin-users";
import {
  deleteUserAccount,
  resendMagicLink,
  setUserBanned,
} from "@/app/(app)/admin/users/actions";

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
        ADMIN_BADGE,
        tone === "alert" && "border-amber-300/40 bg-amber-300/15 text-amber-200",
        tone === "neutral" && "border-white/15 bg-white/[0.06] text-white/55",
        tone === "ok" && "border-emerald-300/35 bg-emerald-300/15 text-emerald-200",
        tone === "brand" && "border-white bg-white text-[#0d0d0d]"
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
    <div className={cn(CARD, "rounded-2xl p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-white">
              {user.email ?? "—"}
            </span>
            {isSelf && <Badge tone="brand">You</Badge>}
            {user.isAdmin && (
              <Badge tone="brand">
                <ShieldCheck className="size-2.5" />
                Admin
              </Badge>
            )}
            {user.banned && (
              <Badge tone="alert">
                <Ban className="size-2.5" />
                Banned
              </Badge>
            )}
            {user.emailConfirmed ? (
              <Badge tone="ok">Confirmed</Badge>
            ) : (
              <Badge tone="neutral">Unconfirmed</Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1 font-mono outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-white/30"
              title="Copy user ID"
            >
              {copied ? (
                <Check className="size-3 text-emerald-300" />
              ) : (
                <Copy className="size-3" />
              )}
              {user.id}
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
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

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={ADMIN_BTN}
            onClick={() => setDialog("resend")}
            disabled={pending || !user.email}
          >
            <Mail className="size-3.5" />
            Magic link
          </button>
          <button
            type="button"
            className={ADMIN_BTN}
            onClick={() => setDialog("ban")}
            disabled={pending || protectedTarget}
            title={protectedTarget ? "Protected account" : undefined}
          >
            {user.banned ? <Undo2 className="size-3.5" /> : <Ban className="size-3.5" />}
            {user.banned ? "Unban" : "Ban"}
          </button>
          <button
            type="button"
            className={cn(ADMIN_BTN, "text-white/60")}
            onClick={() => setDialog("delete")}
            disabled={pending || protectedTarget}
            title={protectedTarget ? "Protected account" : undefined}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
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
        "mt-4 rounded-2xl border p-4",
        isDelete
          ? "border-amber-300/35 bg-amber-300/[0.08]"
          : "border-white/15 bg-white/[0.04]"
      )}
    >
      <div className="flex items-start gap-2.5">
        {isDelete && (
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-200" />
        )}
        <div className="min-w-0 flex-1">
          {dialog === "resend" && (
            <p className="text-pretty text-sm text-white/80">
              Email a fresh sign-in link to{" "}
              <strong className="font-medium text-white">{user.email}</strong>?
            </p>
          )}
          {dialog === "ban" && (
            <p className="text-pretty text-sm text-white/80">
              {user.banned ? (
                <>
                  Unban{" "}
                  <strong className="font-medium text-white">
                    {user.email}
                  </strong>
                  ? They&apos;ll be able to sign in again.
                </>
              ) : (
                <>
                  Ban{" "}
                  <strong className="font-medium text-white">
                    {user.email}
                  </strong>
                  ? They won&apos;t be able to sign in until you unban them.
                </>
              )}
            </p>
          )}
          {isDelete && (
            <>
              <p className="text-pretty text-sm text-white/80">
                Permanently delete{" "}
                <strong className="font-medium text-white">
                  {user.email}
                </strong>{" "}
                and purge all their notes, recordings and stored audio. This
                cannot be undone.
              </p>
              <label className="mt-3 block text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                Type the email to confirm
              </label>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email ?? ""}
                autoComplete="off"
                className={`${ADMIN_INPUT} mt-1.5 max-w-sm`}
                disabled={pending}
              />
            </>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className={ADMIN_BTN_PRIMARY}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {dialog === "resend" && "Send link"}
              {dialog === "ban" && (user.banned ? "Unban user" : "Ban user")}
              {isDelete && "Delete account"}
            </button>
            <button
              type="button"
              className={ADMIN_BTN_GHOST}
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
