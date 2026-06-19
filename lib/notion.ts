import { Client } from "@notionhq/client";
import { MATERIAL_CATEGORIES, type MaterialCategory } from "./types";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export interface NotionProject {
  notionId: string;
  siteName: string;
  customerPageIds: string[];
  lastEditedTime: string;
}

const CUSTOMER_RELATION_PROPERTY = "고객정보 DB";

export async function fetchPortfolioPages(): Promise<NotionProject[]> {
  const dbId = process.env.NOTION_PORTFOLIO_DB_ID;
  if (!dbId) throw new Error("NOTION_PORTFOLIO_DB_ID 환경변수가 없습니다.");

  const projects: NotionProject[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const p = page as any;
      const props = p.properties ?? {};

      const titleProp = Object.values(props).find(
        (prop: any) => prop?.type === "title"
      ) as any;
      const siteName =
        titleProp?.title?.map((t: any) => t.plain_text).join("") ?? "";

      const customerRelProp = props[CUSTOMER_RELATION_PROPERTY];
      const customerPageIds: string[] =
        customerRelProp?.type === "relation" &&
        Array.isArray(customerRelProp.relation)
          ? customerRelProp.relation.map((r: any) => r.id as string)
          : [];

      projects.push({
        notionId: p.id,
        siteName,
        customerPageIds,
        lastEditedTime: p.last_edited_time ?? "",
      });
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return projects;
}

// 포트폴리오 DB의 가구재/도배/마루/타일/필름은 롤업이라 실제 값이 없다.
// 진짜 relation은 "고객정보 DB"로 연결된 프로젝트 DB 페이지에 있다.
export async function resolveMaterialRelations(
  customerPageIds: string[]
): Promise<Record<MaterialCategory, string[]>> {
  const result = Object.fromEntries(
    MATERIAL_CATEGORIES.map((c) => [c, [] as string[]])
  ) as Record<MaterialCategory, string[]>;

  const pages = await Promise.all(
    customerPageIds.map((id) =>
      notion.pages.retrieve({ page_id: id }).catch((e: any) => {
        console.error(`[notion] 고객정보 페이지 조회 실패 (${id}): ${e?.message ?? e}`);
        return null;
      })
    )
  );

  for (const page of pages) {
    if (!page) continue;
    const props = (page as any).properties ?? {};
    for (const category of MATERIAL_CATEGORIES) {
      const relProp = props[category];
      if (relProp?.type === "relation" && Array.isArray(relProp.relation)) {
        result[category].push(...relProp.relation.map((r: any) => r.id as string));
      }
    }
  }

  return result;
}

export async function resolveRelationNames(
  pageIds: string[]
): Promise<string[]> {
  if (pageIds.length === 0) return [];

  const names = await Promise.all(
    pageIds.map((id) =>
      notion.pages.retrieve({ page_id: id })
        .then((page) => {
          const titleProp = Object.values((page as any).properties).find(
            (prop: any) => prop?.type === "title"
          ) as any;
          return titleProp?.title?.map((t: any) => t.plain_text).join("") ?? "";
        })
        .catch((e: any) => {
          console.error(`[notion] relation page 조회 실패 (${id}): ${e?.message ?? e}`);
          return "";
        })
    )
  );

  return names.filter(Boolean);
}

export async function extractImageUrls(pageId: string): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of res.results) {
      const b = block as any;
      if (b.type === "image") {
        const url = b.image?.file?.url ?? b.image?.external?.url ?? "";
        if (url) urls.push(url);
      }
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return urls;
}
