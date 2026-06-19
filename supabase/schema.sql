-- ============================================================
-- Plano 포트폴리오 내부 사이트 - Supabase 스키마
-- ============================================================

create extension if not exists pg_trgm;

create table if not exists portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  notion_id text unique not null,
  site_name text not null,
  synced_at timestamptz default now(),
  notion_last_edited_at timestamptz
);

create table if not exists portfolio_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references portfolio_projects(id) on delete cascade,
  category text not null,
  material_name text not null
);

create table if not exists portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references portfolio_projects(id) on delete cascade,
  url text not null,
  display_order int default 0
);

create or replace view portfolio_search_view as
select
  p.id,
  p.notion_id,
  p.site_name,
  p.synced_at,
  string_agg(m.material_name, ' ') as all_materials,
  p.site_name || ' ' || coalesce(string_agg(m.material_name, ' '), '') as search_text
from portfolio_projects p
left join portfolio_materials m on m.project_id = p.id
group by p.id;

create index if not exists idx_projects_trgm
  on portfolio_projects using gin (site_name gin_trgm_ops);
create index if not exists idx_materials_trgm
  on portfolio_materials using gin (material_name gin_trgm_ops);

-- 자주 쓰는 액세스 패턴용 인덱스
create index if not exists idx_projects_synced_at
  on portfolio_projects (synced_at desc);
create index if not exists idx_materials_project
  on portfolio_materials (project_id);
create index if not exists idx_photos_project
  on portfolio_photos (project_id, display_order);

insert into storage.buckets (id, name, public)
values ('portfolio-images', 'portfolio-images', true)
on conflict (id) do nothing;
