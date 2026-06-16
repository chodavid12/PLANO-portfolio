# 플라노 포트폴리오 내부 사이트

플라노디자인 내부 포트폴리오 검색 사이트. 노션 `포트폴리오 DB`를 소스로 수동 동기화하여
Supabase에 저장하고, 인스타그램형 카드 UI + 검색을 제공한다.

**스택**: Next.js (App Router) · Supabase · Tailwind CSS

> 이 디렉터리는 Jekyll 사이트와 무관한 완전히 독립된 Next.js 프로젝트입니다.
> 별도 repo로 분리하거나, Vercel 배포 시 **Root Directory** 를 `plano-portfolio` 로 지정하세요.

---

## 1. 설치

```bash
cd plano-portfolio
npm install
```

## 2. 환경변수

`.env.local.example` 를 `.env.local` 로 복사하고 값을 채운다.

```
NOTION_TOKEN=secret_xxx              # 노션 integration 토큰
NOTION_PORTFOLIO_DB_ID=xxx           # 포트폴리오 DB ID
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx        # 서버 전용 (절대 클라이언트 노출 금지)
SUPABASE_STORAGE_BUCKET=portfolio-images
```

> 노션: 해당 integration을 포트폴리오 DB와 자재 DB **양쪽에** 연결(share)해야
> relation page 조회가 가능합니다.

## 3. Supabase 준비

1. SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 실행
2. Storage → New bucket → 이름 `portfolio-images` → **Public 체크** 후 생성
   (위 SQL 마지막 블록으로도 생성됩니다)

## 4. 실행

```bash
npm run dev      # http://localhost:3000
```

화면 우하단 **🔄 동기화 버튼**을 누르면 노션 → Supabase 전체 동기화가 수행된다.

---

## 구조

```
app/
  page.tsx                  # 메인 그리드 + 검색바 (서버 컴포넌트 → HomeView)
  [id]/page.tsx             # 상세 페이지 (2컬럼 / 모바일 세로 스택)
  _components/
    HomeView.tsx            # 검색 상태 관리 (debounce 300ms)
    ProjectCard.tsx         # 카드 (썸네일 + 현장명 + 자재 태그 3개)
    SearchBar.tsx
    SyncButton.tsx          # FAB + 로딩 스피너 + 완료 토스트
    PhotoSlider.tsx         # 스와이프 사진 슬라이더
  api/
    sync/route.ts           # POST  노션 → Supabase 전체 동기화
    search/route.ts         # GET   ?q= 검색
    projects/route.ts       # GET   전체 목록
    projects/[id]/route.ts  # GET   상세
lib/
  notion.ts                 # 노션 조회 + relation 이름 resolve + 이미지 URL 추출
  supabase.ts               # Supabase 관리자 클라이언트
  sync.ts                   # 동기화 오케스트레이션 + Storage 이미지 복사
  projects.ts               # 목록/상세/검색 쿼리
  types.ts
supabase/schema.sql
```

## 동작 메모

- 노션 이미지 URL은 약 1시간 후 만료되므로 동기화 시점에 Supabase Storage로 복사한다.
  경로 패턴: `{notion_page_id}/{index}.jpg`
- 자재는 `project_id` 기준 전체 삭제 후 재삽입(부분 갱신 X).
- 검색은 `portfolio_search_view`(현장명 + 전체 자재명 합산)에 `ilike` 부분검색.

## 배포 (Vercel)

1. New Project → 이 repo 연결
2. **Root Directory** = `plano-portfolio`
3. Environment Variables에 위 5~6개 값 입력
4. Deploy
