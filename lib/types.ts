export const MATERIAL_CATEGORIES = [
  "가구재",
  "도배",
  "마루",
  "타일",
  "필름",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export interface Material {
  category: string;
  material_name: string;
}

export interface Photo {
  url: string;
  display_order: number;
}

export interface Project {
  id: string;
  notion_id: string;
  site_name: string;
  synced_at: string;
  materials: Material[];
  photos: Photo[];
}

export interface SyncResult {
  synced: number;
  errors: string[];
}
