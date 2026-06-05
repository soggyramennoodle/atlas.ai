"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The note body as a single, continuous word-processor canvas (§1). Replaces the
 * old per-bullet textareas so the whole note edits like Google Docs / Apple
 * Notes — deleting a bullet removes its line entirely, with no ghost spacing.
 * Emits HTML on every change; the parent debounces and autosaves it.
 */
export function RichNoteEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Drop the marks/nodes the toolbar doesn't expose to keep notes clean.
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing your notes…",
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "note-prose min-h-[24rem] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div className="min-h-[24rem] animate-pulse rounded-[4px] bg-muted/40" />
    );
  }

  return (
    <div className="rounded-[4px] border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <Toolbar editor={editor} />
      <div className="px-5 py-5 sm:px-7">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-1 rounded-t-[4px] border-b bg-card/90 px-3 py-2 backdrop-blur-xl">
      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolButton>
      <ToolButton
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-accent hover:text-foreground",
        active && "bg-foreground text-background"
      )}
    >
      {children}
    </button>
  );
}
