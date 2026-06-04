import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { pointText, metaLine, type ExportData } from "./shared";
import { htmlToExportLines, type InlineRun } from "./html-blocks";

// Clean print palette — pearl page, near-black text, indigo brand accents.
const ACCENT = "#6C63FF";
const INK = "#1a1a1f";
const MUTED = "#55555f";

const styles = StyleSheet.create({
  page: { paddingVertical: 54, paddingHorizontal: 56, fontSize: 11, color: INK },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 9, color: MUTED, marginBottom: 4, letterSpacing: 0.4 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#dcdce2", marginVertical: 16 },
  summaryBox: {
    backgroundColor: "#f2f1fd",
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    padding: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1.5,
    marginBottom: 5,
    fontWeight: 700,
  },
  summaryText: { lineHeight: 1.5 },
  h1: { fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 8, color: INK },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 10, marginBottom: 5, color: MUTED },
  para: { marginBottom: 6, lineHeight: 1.5 },
  bulletRow: { flexDirection: "row", marginBottom: 5, paddingRight: 6 },
  dot: { color: ACCENT, marginRight: 6 },
  bulletText: { flex: 1, lineHeight: 1.45 },
  subBlock: { marginLeft: 12, marginTop: 4, borderLeftWidth: 1, borderLeftColor: "#e4e4ea", paddingLeft: 10 },
  conceptsHeading: { fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  conceptTerm: { fontWeight: 700, marginBottom: 2 },
  conceptDef: { color: MUTED, marginBottom: 8, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 56,
    right: 56,
    fontSize: 8,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

/** Render inline formatting runs as nested <Text> nodes. */
function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontWeight: r.bold ? 700 : 400,
            fontStyle: r.italic ? "italic" : "normal",
            textDecoration: r.underline ? "underline" : "none",
          }}
        >
          {r.text}
        </Text>
      ))}
    </>
  );
}

/** Rich-text body (edited notes): a flat, page-break-safe line list. */
function HtmlBody({ html }: { html: string }) {
  const lines = htmlToExportLines(html);
  return (
    <>
      {lines.map((line, i) => {
        if (line.type === "h2") {
          return (
            <Text key={i} style={styles.h1} minPresenceAhead={40}>
              <Runs runs={line.runs} />
            </Text>
          );
        }
        if (line.type === "h3") {
          return (
            <Text key={i} style={styles.h2} minPresenceAhead={32}>
              <Runs runs={line.runs} />
            </Text>
          );
        }
        if (line.type === "li") {
          return (
            <View
              key={i}
              style={[styles.bulletRow, { marginLeft: 6 + line.level * 14 }]}
            >
              <Text style={styles.dot}>{line.marker ?? "•"}</Text>
              <Text style={styles.bulletText}>
                <Runs runs={line.runs} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.para}>
            <Runs runs={line.runs} />
          </Text>
        );
      })}
    </>
  );
}

/** Structured body (un-edited notes). */
function StructuredBody({ notes }: { notes: ExportData["notes"] }) {
  return (
    <>
      {(notes.sections ?? []).map((section, i) => (
        // No wrap={false}: long sections must be allowed to flow across pages,
        // otherwise react-pdf overlaps the overflow onto a single page (the
        // jumbled-text bug). minPresenceAhead keeps a heading with its body.
        <View key={i}>
          <Text style={styles.h1} minPresenceAhead={40}>
            {(i + 1).toString().padStart(2, "0")}  {section.heading}
          </Text>
          {(section.points ?? []).map((p, j) => (
            <View key={j} style={styles.bulletRow}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.bulletText}>{pointText(p)}</Text>
            </View>
          ))}
          {(section.subsections ?? []).map((sub, k) => (
            <View key={k} style={styles.subBlock}>
              <Text style={styles.h2} minPresenceAhead={28}>
                {sub.heading}
              </Text>
              {(sub.points ?? []).map((p, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={styles.dot}>–</Text>
                  <Text style={styles.bulletText}>{pointText(p)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function NoteDocument({ data }: { data: ExportData }) {
  const { notes } = data;
  return (
    <Document title={data.lectureTitle} author={data.studentName ?? "Atlas"}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{data.lectureTitle}</Text>
        <Text style={styles.meta}>{metaLine(data)}</Text>
        <View style={styles.rule} />

        {notes.summary ? (
          <View style={styles.summaryBox} wrap={false}>
            <Text style={styles.summaryLabel}>SUMMARY</Text>
            <Text style={styles.summaryText}>{notes.summary}</Text>
          </View>
        ) : null}

        {notes.bodyHtml ? (
          <HtmlBody html={notes.bodyHtml} />
        ) : (
          <StructuredBody notes={notes} />
        )}

        {(notes.keyConcepts ?? []).length > 0 ? (
          <View>
            <Text style={styles.conceptsHeading}>Key Concepts</Text>
            {notes.keyConcepts.map((c, i) => (
              <View key={i} wrap={false}>
                <Text style={styles.conceptTerm}>{c.term}</Text>
                <Text style={styles.conceptDef}>{c.definition}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Generated by Atlas</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Render a notes document to a PDF buffer. */
export async function renderNotePdf(data: ExportData): Promise<Buffer> {
  return renderToBuffer(<NoteDocument data={data} />);
}
