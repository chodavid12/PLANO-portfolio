import {
  extractImageUrls,
  fetchPortfolioPages,
  resolveMaterialRelations,
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let buffer: ArrayBuffer;
    try {
      const res = await fetch(imageUrls[i], { signal: controller.signal });
      if (!res.ok) continue;
      buffer = await res.arrayBuffer();
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
    const path = `${folder}/${i}.jpg`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      console.warn(`이미지 업로드 실패 (${path}): ${error.message}`);
      continue;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    publicUrls.push(data.publicUrl);
  }

  return publicUrls;
}

export async function runSync(): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let synced = 0;

  console.log("[sync] 노션 포트폴리오 페이지 조회 시작...");
  const pages = await fetchPortfolioPages();
  console.log(`[sync] 총 ${pages.length}개 현장 발견. 동기화 시작.`);

  let idx = 0;
  for (const page of pages) {
    idx++;
    const label = page.siteName || page.notionId;
    console.log(`[sync] (${idx}/${pages.length}) "${label}" 처리 중...`);
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
      const materialRelations = await resolveMaterialRelations(page.customerPageIds);
      for (const category of MATERIAL_CATEGORIES) {
        const pageIds = materialRelations[category] ?? [];
        const names = await resolveRelationNames(pageIds);
        console.log(`[sync]   ${category}: relation ${pageIds.length}건 → 이름 ${names.length}건 확인`);
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

      const { count: existingPhotoCount } = await supabase
        .from("portfolio_photos")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);

      if ((existingPhotoCount ?? 0) > 0) {
        console.log(`[sync]   자재 ${materialRows.length}건 처리. 기존 사진 ${existingPhotoCount}장 있음 → 이미지 단계 건너뜀.`);
      } else {
        console.log(`[sync]   자재 ${materialRows.length}건 처리. 이미지 조회 중...`);
        const imageUrls = await extractImageUrls(page.notionId);
        console.log(`[sync]   이미지 ${imageUrls.length}장 발견. Storage 업로드 중...`);
        const publicUrls = await saveImagesToStorage(page.notionId, imageUrls);
        console.log(`[sync]   이미지 ${publicUrls.length}장 업로드 완료.`);

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
      }

      synced++;
    } catch (e: any) {
      console.error(`[sync]   ✗ "${label}" 실패: ${e?.message ?? String(e)}`);
      errors.push(`${label}: ${e?.message ?? String(e)}`);
    }
  }

  console.log(`[sync] 완료. 성공 ${synced}건, 오류 ${errors.length}건.`);
  return { synced, errors };
}
