import "server-only";
import type { NotePoint, StructuredNotes } from "@/lib/types";

/** Plain text of a bullet, tolerating the old string shape. */
export function pointText(p: NotePoint | string): string {
  return typeof p === "string" ? p : p.text;
}

export interface ExportData {
  lectureTitle: string;
  courseTitle: string | null;
  dateLabel: string;
  studentName: string | null;
  notes: StructuredNotes;
}

/** Build the header subtitle line shared by both exporters. */
export function metaLine(d: ExportData): string {
  return [
    d.courseTitle,
    d.dateLabel,
    d.studentName ? `Notes for ${d.studentName}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
}
