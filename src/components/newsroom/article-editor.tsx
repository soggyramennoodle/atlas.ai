"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, ExternalLink, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategoryChip, SeverityChip } from "@/components/newsroom/chips";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  slugify,
  type NewsroomArticle,
  type NewsroomCategory,
  type NewsroomSeverity,
} from "@/lib/newsroom";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeNoteHtml } from "@/lib/notes-html";
import {
  saveArticle,
  type ArticleInput,
} from "@/app/(app)/admin/newsroom/actions";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "h-9 w-full rounded-[4px] border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Convert an ISO timestamp to a `datetime-local` input value (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ArticleEditor({ article }: { article: NewsroomArticle | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!article);
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [category, setCategory] = useState<NewsroomCategory>(
    article?.category ?? "announcement"
  );
  const [status, setStatus] = useState<string>(article?.status ?? "draft");
  const [version, setVersion] = useState(article?.version ?? "");
  const [severity, setSeverity] = useState<NewsroomSeverity | "">(
    article?.severity ?? ""
  );
  const [tags, setTags] = useState((article?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const [publishedAt, setPublishedAt] = useState(
    toLocalInput(article?.published_at ?? null)
  );
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Auto-slug from title until the user edits the slug field directly.
  const effectiveSlug = slug;
  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  const previewHtml = useMemo(
    () => sanitizeNoteHtml(renderMarkdown(body || "_Nothing to preview yet._")),
    [body]
  );

  function submit(overrideStatus?: string) {
    const finalStatus = overrideStatus ?? status;
    const input: ArticleInput = {
      title,
      slug: effectiveSlug,
      excerpt,
      body,
      category,
      status: finalStatus,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      version,
      severity,
      featured,
      published_at: publishedAt,
    };

    startTransition(async () => {
      const res = await saveArticle(article?.id ?? null, input);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't save the article.");
        return;
      }
      if (overrideStatus) setStatus(overrideStatus);
      toast.success(
        article ? "Article updated." : "Article created."
      );
      router.push("/admin/newsroom");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/newsroom"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All articles
        </Link>
        <div className="flex items-center gap-2">
          {article?.status === "published" && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/newsroom/${article.slug}`} target="_blank">
                View <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          )}
          {status !== "published" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => submit("published")}
            >
              Publish now
            </Button>
          )}
          <Button size="sm" disabled={pending} onClick={() => submit()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <h1 className="mt-6 text-3xl font-extrabold">
        {article ? "Edit article" : "New article"}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        {/* Main column */}
        <div className="space-y-6">
          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="A clear, specific headline"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            hint="Auto-generated from the title. Edit to customize."
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                /newsroom/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => setSlug((s) => slugify(s))}
                placeholder="my-article"
                className="font-mono"
              />
            </div>
          </Field>

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            hint="A short dek shown on cards and at the top of the article."
          >
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              placeholder="One or two sentences summarizing the story."
            />
          </Field>

          {/* Body with write/preview tabs */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <div className="flex rounded-[4px] border bg-card p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTab("write")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 font-medium transition",
                    tab === "write"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pencil className="size-3" /> Write
                </button>
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 font-medium transition",
                    tab === "preview"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="size-3" /> Preview
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Markdown supported: <code>#</code> headings, <code>**bold**</code>,{" "}
              <code>- lists</code>, <code>&gt; quotes</code>, <code>`code`</code>,{" "}
              <code>[links](url)</code>.
            </p>
            {tab === "write" ? (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                className="mt-2 font-mono text-sm leading-relaxed"
                placeholder={"## Section heading\n\nWrite your update here…"}
              />
            ) : (
              <div
                className="article-prose mt-2 min-h-[24rem] rounded-[4px] border bg-card p-5"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </div>

        {/* Sidebar: metadata */}
        <aside className="space-y-6 rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] lg:sticky lg:top-8 lg:self-start">
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>

          <Field label="Category" htmlFor="category">
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as NewsroomCategory)}
              className={SELECT_CLASS}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <CategoryChip category={category} />
            </div>
          </Field>

          <Field
            label="Severity"
            htmlFor="severity"
            hint="For notices, maintenance and security advisories."
          >
            <select
              id="severity"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as NewsroomSeverity | "")
              }
              className={SELECT_CLASS}
            >
              <option value="">None</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            {severity && (
              <div className="mt-2">
                <SeverityChip severity={severity} />
              </div>
            )}
          </Field>

          <Field
            label="Version"
            htmlFor="version"
            hint="Optional, e.g. v0.4.1"
          >
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v0.4.1"
              className="font-mono"
            />
          </Field>

          <Field
            label="Tags"
            htmlFor="tags"
            hint="Comma-separated."
          >
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="launch, notes"
            />
          </Field>

          <Field
            label="Publish date"
            htmlFor="published_at"
            hint="Defaults to now when first published."
          >
            <Input
              id="published_at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 rounded-[4px] border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/45">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">Featured</span>
              <span className="block text-xs text-muted-foreground">
                Pin as the lead story on the Newsroom.
              </span>
            </span>
          </label>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
