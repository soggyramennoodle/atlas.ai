"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Pencil,
  MoreHorizontal,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip, StatusChip } from "@/components/newsroom/chips";
import { formatShortDate, type NewsroomArticle } from "@/lib/newsroom";
import {
  setArticleStatus,
  deleteArticle,
} from "@/app/(app)/admin/newsroom/actions";

type Row = Pick<
  NewsroomArticle,
  | "id"
  | "slug"
  | "title"
  | "category"
  | "status"
  | "version"
  | "featured"
  | "updated_at"
  | "published_at"
>;

export function AdminArticleList({ articles }: { articles: Row[] }) {
  return (
    <ul className="divide-y rounded-2xl border bg-card/50">
      {articles.map((a) => (
        <ArticleRow key={a.id} article={a} />
      ))}
    </ul>
  );
}

function ArticleRow({ article }: { article: Row }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(ok);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-4 px-4 py-3.5 first:rounded-t-2xl last:rounded-b-2xl">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={article.status} />
          <CategoryChip category={article.category} />
          {article.featured && (
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">
              ★ Featured
            </span>
          )}
          {article.version && (
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {article.version}
            </span>
          )}
        </div>
        <Link
          href={`/admin/newsroom/${article.id}`}
          className="mt-1.5 block truncate font-medium leading-snug transition hover:text-primary"
        >
          {article.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {article.status === "published" && article.published_at
            ? `Published ${formatShortDate(article.published_at)}`
            : `Updated ${formatShortDate(article.updated_at)}`}
        </p>
      </div>

      <Link
        href={`/admin/newsroom/${article.id}`}
        className="hidden shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground sm:inline-flex"
      >
        <Pencil className="size-3.5" /> Edit
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={pending}
            aria-label="Article actions"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/admin/newsroom/${article.id}`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </DropdownMenuItem>
          {article.status === "published" ? (
            <DropdownMenuItem asChild>
              <Link href={`/newsroom/${article.slug}`} target="_blank">
                <ExternalLink className="size-4" /> View live
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {article.status !== "published" && (
            <DropdownMenuItem
              onSelect={() =>
                run(() => setArticleStatus(article.id, "published"), "Published.")
              }
            >
              <Eye className="size-4" /> Publish
            </DropdownMenuItem>
          )}
          {article.status === "published" && (
            <DropdownMenuItem
              onSelect={() =>
                run(() => setArticleStatus(article.id, "draft"), "Unpublished.")
              }
            >
              <EyeOff className="size-4" /> Unpublish
            </DropdownMenuItem>
          )}
          {article.status !== "archived" && (
            <DropdownMenuItem
              onSelect={() =>
                run(() => setArticleStatus(article.id, "archived"), "Archived.")
              }
            >
              <Archive className="size-4" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmDelete && (
        <ConfirmDelete
          title={article.title}
          pending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            run(() => deleteArticle(article.id), "Article deleted.");
          }}
        />
      )}
    </li>
  );
}

function ConfirmDelete({
  title,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Delete this article?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          “{title}” will be permanently removed. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white transition hover:bg-destructive/90 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
