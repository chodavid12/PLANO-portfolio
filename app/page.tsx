import HomeView from "./_components/HomeView";
import { getAllProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let projects: Project[] = [];
  try {
    projects = await getAllProjects();
  } catch (e) {
    console.error("프로젝트 목록 조회 실패:", e);
  }

  return <HomeView initialProjects={projects} />;
}
