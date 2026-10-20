import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "documents";

export function normalizeStoragePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^documents\//i, "")
    .trim();
}

export function getSupabaseConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.";
  }
  if (supabaseAnonKey.includes("<") || supabaseAnonKey.includes(">") || supabaseAnonKey === "YOUR_SUPABASE_PUBLISHABLE_KEY") {
    return "VITE_SUPABASE_ANON_KEY still contains a placeholder. Set it to the real sb_publishable_ key.";
  }
  if (supabaseAnonKey.startsWith("sb_secret_") || supabaseAnonKey.includes("service_role")) {
    return "A Supabase secret or service-role key cannot be used in the frontend.";
  }
  return null;
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (import.meta.env.DEV) {
  console.info("[Supabase initialization]", {
    url: supabaseUrl,
    keyExists: Boolean(supabaseAnonKey),
    keyPrefix: supabaseAnonKey?.slice(0, 14) || null,
    keyLength: supabaseAnonKey?.length || 0,
  });
}

// Type-safe database helper
export async function uploadStudents(
  data: Array<{ enrollmentNo: string; name: string; email: string }>
) {
  try {
    const { error } = await supabase.from("students").insert(data);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function uploadDocument(
  enrollmentNo: string,
  file: File
) {
  try {
    const path = normalizeStoragePath(`${enrollmentNo}/${file.name}`);
    const { error } = await supabase.storage
      .from(storageBucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    // Index in database
    const { error: dbError } = await supabase
      .from("documents")
      .insert({
        enrollment_no: enrollmentNo,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
      });

    if (dbError) throw dbError;
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createEmailJob(jobName: string, totalRecords: number) {
  try {
    const { data, error } = await supabase
      .from("email_jobs")
      .insert({ job_name: jobName, total_count: totalRecords })
      .select("id")
      .single();

    if (error) throw error;
    return { jobId: data.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getEmailJobResults(jobId: string) {
  try {
    const { data, error } = await supabase
      .from("email_job_items")
      .select("*")
      .eq("job_id", jobId);

    if (error) throw error;
    return { results: data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
