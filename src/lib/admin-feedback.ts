import type { FeedbackCategory, FeedbackStatus } from "@/lib/types";

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  inaccurate: "Inaccurate notes",
  wrong: "Wrong information",
  other: "Other feedback",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  unread: "Unread",
  read: "Read",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const FEEDBACK_STATUS_TONES: Record<
  FeedbackStatus,
  "alert" | "neutral" | "ok" | "muted"
> = {
  unread: "alert",
  read: "neutral",
  resolved: "ok",
  dismissed: "muted",
};

export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  "unread",
  "read",
  "resolved",
  "dismissed",
];

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "inaccurate",
  "wrong",
  "other",
];

export function formatFeedbackWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
