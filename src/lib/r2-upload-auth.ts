import "server-only";

import { extForAudioContentType } from "@/lib/r2-audio";
import { createClient } from "@/lib/supabase/server";

export class UploadAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Verify the caller owns the job and return the deterministic R2 key. */
export async function assertJobSegmentUpload(args: {
  jobId: string;
  segmentIndex: number;
  contentType: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UploadAuthError("Not authenticated.");

  const { data: job } = await supabase
    .from("lecture_jobs")
    .select("id")
    .eq("id", args.jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) throw new UploadAuthError("Unknown job.", 404);

  const ext = extForAudioContentType(args.contentType);
  const key = `${user.id}/${args.jobId}/${args.segmentIndex}.${ext}`;
  return { supabase, user, key };
}
