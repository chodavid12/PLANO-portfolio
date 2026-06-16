"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import SearchBar from "./SearchBar";
import ProjectCard from "./ProjectCard";
import SyncButton from "./SyncButton";

export default function HomeView({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) setProjects(initialProjects);
  }, [initialProjects, query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setProjects(initialProjects);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setProjects(data.projects ?? []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, initialProjects]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <header className="mb-5">
        <h1 className="mb-3 text-xl font-bold text-ink">플라노 포트폴리오</h1>
        <div className="sticky top-3 z-30">
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>

      {loading ? (
        <p className="py-20 text-center text-sm text-muted">검색 중…</p>
      ) : projects.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted">
          {query.trim() ? "검색 결과가 없습니다." : "동기화된 현장이 없습니다. 🔄 버튼을 눌러 동기화하세요."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <SyncButton />
    </main>
  );
}
