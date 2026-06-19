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

interface ExistingRow {
  id: string;
  notion_id: string;
  notion_last_edited_at: string | null;
  has_materials: boolean;
  has_photos: boolean;
}

async function loadExistingState(): Promise<Map<string, ExistingRow>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select(
      "id, notion_id, notion_last_edited_at, portfolio_materials(id), portfolio_photos(id)"
    );
  if (error) throw new Error(`기존 상태 조회 실패: ${error.message}`);

  const map = new Map<string, ExistingRow>();
  for (const row of data ?? []) {
    const r = row as any;
    map.set(r.notion_id, {
      id: r.id,
      notion_id: r.notion_id,
      notion_last_edited_at: r.notion_last_edited_at,
      has_materials: (r.portfolio_materials ?? []).length > 0,
      has_photos: (r.portfolio_photos ?? []).length > 0,
    });
  }
  return map;
}

export async function runSync(): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  console.log("[sync] 노션 포트폴리오 페이지 조회 시작...");
  const [pages, existing] = await Promise.all([
    fetchPortfolioPages(),
    loadExistingState(),
  ]);
  console.log(`[sync] 총 ${pages.length}개 현장 발견. 기존 ${existing.size}건.`);

  for (let idx = 0; idx < pages.length; idx++) {
    const page = pages[idx];
    const label = page.siteName || page.notionId;
    const prior = existing.get(page.notionId);

    const unchanged =
      prior &&
      prior.notion_last_edited_at === page.lastEditedTime &&
      prior.has_materials &&
      prior.has_photos;

    if (unchanged) {
      skipped++;
      continue;
    }

    console.log(`[sync] (${idx + 1}/${pages.length}) "${label}" 처리 중...`);
    try {
      const { data: project, error: upsertError } = await supabase
        .from("portfolio_projects")
        .upsert(
          {
            notion_id: page.notionId,
            site_name: page.siteName,
            notion_last_edited_at: page.lastEditedTime || null,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "notion_id" }
        )
        .select("id")
        .single();

      if (upsertError || !project) {
        throw new Error(upsertError?.message ?? "project upsert 실패");
      }
      const projectId = project.id as string;

      const materialRelations = await resolveMaterialRelations(page.customerPageIds);
      const materialRows: { project_id: string; category: string; material_name: string }[] = [];
      for (const category of MATERIAL_CATEGORIES) {
        const names = await resolveRelationNames(materialRelations[category]);
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

      if (prior?.has_photos) {
        console.log(`[sync]   자재 ${materialRows.length}건. 기존 사진 보존.`);
      } else {
        const imageUrls = await extractImageUrls(page.notionId);
        const publicUrls = await saveImagesToStorage(page.notionId, imageUrls);
        console.log(`[sync]   자재 ${materialRows.length}건, 사진 ${publicUrls.length}장 업로드.`);

        if (publicUrls.length > 0) {
          const photoRows = publicUrls.map((url, i) => ({
            project_id: projectId,
            url,
            display_order: i,
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

  console.log(
    `[sync] 완료. 처리 ${synced}건, 건너뜀 ${skipped}건, 오류 ${errors.length}건.`
  );
  return { synced, skipped, errors };
}
