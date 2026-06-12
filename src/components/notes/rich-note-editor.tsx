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
      <div className="min-h-[24rem] animate-pulse rounded-3xl bg-black/[0.04]" />
    );
  }

  return (
    <div className="rounded-3xl border border-black/[0.08] bg-white shadow-[0_18px_50px_-32px_rgba(0,0,0,0.25)]">
      <Toolbar editor={editor} />
      <div className="px-5 py-5 sm:px-7">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-1 rounded-t-3xl border-b border-black/[0.08] bg-white/90 px-3 py-2 backdrop-blur-md">
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

      <span className="mx-1 h-5 w-px bg-black/[0.08]" />

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

      <span className="mx-1 h-5 w-px bg-black/[0.08]" />

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
        "grid size-8 place-items-center rounded-full text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25",
        active && "bg-[#0d0d0d] text-white hover:bg-[#0d0d0d] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
