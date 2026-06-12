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
import {
  ADMIN_BTN,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PRIMARY,
  CARD,
  cn,
} from "@/components/admin/admin-kit";
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
    <ul className={cn(CARD, "divide-y divide-black/[0.06] overflow-hidden")}>
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
    <li className="flex items-center gap-4 px-5 py-4 transition duration-300 ease-out hover:bg-black/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={article.status} />
          <CategoryChip category={article.category} />
          {article.featured && (
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[#0d0d0d]">
              ★ Featured
            </span>
          )}
          {article.version && (
            <span className="font-mono text-[0.65rem] text-[#0d0d0d]/50">
              {article.version}
            </span>
          )}
        </div>
        <Link
          href={`/admin/newsroom/${article.id}`}
          className="mt-1.5 block truncate font-medium leading-snug text-[#0d0d0d] outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-black/25"
        >
          {article.title}
        </Link>
        <p className="mt-0.5 text-xs text-[#0d0d0d]/50">
          {article.status === "published" && article.published_at
            ? `Published ${formatShortDate(article.published_at)}`
            : `Updated ${formatShortDate(article.updated_at)}`}
        </p>
      </div>

      <Link
        href={`/admin/newsroom/${article.id}`}
        className={cn(ADMIN_BTN, "hidden sm:inline-flex")}
      >
        <Pencil className="size-3.5" /> Edit
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={pending}
            aria-label="Article actions"
            className="grid size-8 shrink-0 place-items-center rounded-full text-[#0d0d0d]/45 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-black/25"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-2xl border-black/[0.08] bg-white text-[#0d0d0d] shadow-[0_1px_2px_rgba(13,13,13,0.05),0_24px_60px_-32px_rgba(13,13,13,0.4)]"
        >
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0d0d0d]/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-black/[0.08] bg-white p-6 text-[#0d0d0d] shadow-[0_1px_2px_rgba(13,13,13,0.05),0_36px_90px_-40px_rgba(13,13,13,0.45)]">
        <h2 className="text-xl font-normal tracking-[-0.01em]">
          Delete this <span className="font-instrument italic">article?</span>
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#0d0d0d]/60">
          “{title}” will be permanently removed. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className={ADMIN_BTN_GHOST}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={ADMIN_BTN_PRIMARY}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
