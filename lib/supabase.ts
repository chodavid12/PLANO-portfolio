import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 확인하세요."
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "portfolio-images";
