import {
  extractImageUrls,
  fetchPortfolioPages,
  resolveRelationNames,
} from "./notion";
import { getSupabaseAdmin, STORAGE_BUCKET } from "./supabase";
import { MATERIAL_CATEGORIES, type SyncResult } from "./types";

async function saveImagesToStorage(
  notionPageId: string,
  imageUrls: string[]
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const folder = notionPageId.replace(/-/g, "");
  const publicUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const res = await fetch(imageUrls[i]);
    if (!res.ok) continue;
    const buffer = await res.arrayBuffer();
    const path = `${folder}/${i}.jpg`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { upsert: true, contentType: "image/jpeg" });

    if (error) throw new Error(`이미지 업로드 실패 (${path}): ${error.message}`);

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    publicUrls.push(data.publicUrl);
  }

  return publicUrls;
}

export async function runSync(): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let synced = 0;

  const pages = await fetchPortfolioPages();

  for (const page of pages) {
    try {
      const { data: project, error: upsertError } = await supabase
        .from("portfolio_projects")
        .upsert(
          { notion_id: page.notionId, site_name: page.siteName, synced_at: new Date().toISOString() },
          { onConflict: "notion_id" }
        )
        .select("id")
        .single();

      if (upsertError || !project) {
        throw new Error(upsertError?.message ?? "project upsert 실패");
      }
      const projectId = project.id as string;

      const materialRows: { project_id: string; category: string; material_name: string }[] = [];
      for (const category of MATERIAL_CATEGORIES) {
        const pageIds = page.materialRelations[category] ?? [];
        const names = await resolveRelationNames(pageIds);
        for (const name of names) {
          materialRows.push({ project_id: projectId, category, material_name: name });
        }
      }

      await supabase.from("portfolio_materials").delete().eq("project_id", projectId);
      if (materialRows.length > 0) {
        const { error: matError } = await supabase
          .from("portfolio_materials")
          .insert(materialRows);
        if (matError) throw new Error(`자재 저장 실패: ${matError.message}`);
      }

      const imageUrls = await extractImageUrls(page.notionId);
      const publicUrls = await saveImagesToStorage(page.notionId, imageUrls);

      await supabase.from("portfolio_photos").delete().eq("project_id", projectId);
      if (publicUrls.length > 0) {
        const photoRows = publicUrls.map((url, idx) => ({
          project_id: projectId,
          url,
          display_order: idx,
        }));
        const { error: photoError } = await supabase
          .from("portfolio_photos")
          .insert(photoRows);
        if (photoError) throw new Error(`사진 저장 실패: ${photoError.message}`);
      }

      synced++;
    } catch (e: any) {
      errors.push(`${page.siteName || page.notionId}: ${e?.message ?? String(e)}`);
    }
  }

  return { synced, errors };
}
