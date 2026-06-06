import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getR2Bucket, r2 } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import type { LectureSegmentRecord, NoteRecord } from "@/lib/types";

export const runtime = "nodejs";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "lecture";
}

function extForKey(key: string) {
  return key.split(".").pop()?.toLowerCase() || "webm";
}

function mimeForExt(ext: string) {
  const map: Record<string, string> = {
    webm: "audio/webm",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
    flac: "audio/flac",
  };
  return map[ext] ?? "application/octet-stream";
}

async function getObject(key: string) {
  const { Body } = await r2.send(
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: key })
  );
  if (!Body) throw new Error("R2 object had no body.");
  return Buffer.from(await Body.transformToByteArray());
}

function zipStore(files: { name: string; data: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, file.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + file.data.length;
  }

  const centralOffset = offset;
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, central, end]);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: note } = await supabase
    .from("notes")
    .select("id, title, audio_path, content")
    .eq("id", id)
    .single();

  const ownedNote = note as Pick<NoteRecord, "id" | "title" | "audio_path" | "content"> | null;
  if (!ownedNote?.audio_path) {
    return NextResponse.json({ error: "No recording is available for this note." }, { status: 404 });
  }

  if (ownedNote.audio_path.includes("/")) {
    const ext = extForKey(ownedNote.audio_path);
    const data = await getObject(ownedNote.audio_path);
    return new Response(data, {
      headers: {
        "Content-Type": mimeForExt(ext),
        "Content-Disposition": `attachment; filename="${safeName(ownedNote.title)}.${ext}"`,
      },
    });
  }

  const [{ data: job }, { data: segments }] = await Promise.all([
    supabase
      .from("lecture_jobs")
      .select("id")
      .eq("id", ownedNote.audio_path)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("lecture_segments")
      .select("*")
      .eq("job_id", ownedNote.audio_path)
      .order("index", { ascending: true }),
  ]);

  if (!job) return NextResponse.json({ error: "No recording is available for this note." }, { status: 404 });

  const ordered = ((segments as LectureSegmentRecord[] | null) ?? []).filter((s) => s.r2_key);
  if (ordered.length === 0) {
    return NextResponse.json({ error: "No recording is available for this note." }, { status: 404 });
  }

  if (ordered.length === 1) {
    const ext = extForKey(ordered[0].r2_key);
    const data = await getObject(ordered[0].r2_key);
    return new Response(data, {
      headers: {
        "Content-Type": mimeForExt(ext),
        "Content-Disposition": `attachment; filename="${safeName(ownedNote.title)}.${ext}"`,
      },
    });
  }

  const files = await Promise.all(
    ordered.map(async (segment) => {
      const ext = extForKey(segment.r2_key);
      return {
        name: `segment-${String(segment.index + 1).padStart(3, "0")}.${ext}`,
        data: await getObject(segment.r2_key),
      };
    })
  );

  return new Response(zipStore(files), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName(ownedNote.title)}-audio-segments.zip"`,
    },
  });
}
