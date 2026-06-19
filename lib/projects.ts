import { getSupabaseAdmin } from "./supabase";
import type { Project } from "./types";

const SELECT =
  "id, notion_id, site_name, synced_at, portfolio_materials(category, material_name), portfolio_photos(url, display_order)";

function normalize(row: any): Project {
  const photos = (row.portfolio_photos ?? [])
    .map((p: any) => ({ url: p.url, display_order: p.display_order ?? 0 }))
    .sort((a: any, b: any) => a.display_order - b.display_order);

  return {
    id: row.id,
    notion_id: row.notion_id,
    site_name: row.site_name,
    synced_at: row.synced_at,
    materials: (row.portfolio_materials ?? []).map((m: any) => ({
      category: m.category,
      material_name: m.material_name,
    })),
    photos,
  };
}

export async function getAllProjects(): Promise<Project[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select(SELECT)
    .order("synced_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalize);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalize(data) : null;
}

// LIKE 패턴에서 사용자 입력의 %, _, \ 이스케이프
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function searchProjects(query: string): Promise<Project[]> {
  const q = query.trim();
  if (!q) return getAllProjects();

  const supabase = getSupabaseAdmin();
  const pattern = `%${escapeLike(q)}%`;

  // 자재명 OR 현장명 매칭 — search_text 뷰가 두 가지 모두 포함하므로 1쿼리
  const { data: matches, error: matchError } = await supabase
    .from("portfolio_search_view")
    .select("id")
    .ilike("search_text", pattern)
    .limit(50);
  if (matchError) throw new Error(matchError.message);

  const ids = (matches ?? []).map((m: any) => m.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("portfolio_projects")
    .select(SELECT)
    .in("id", ids)
    .order("synced_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalize);
}
