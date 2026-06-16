import { NextResponse } from "next/server";
import { getAllProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await getAllProjects();
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json(
      { projects: [], error: e?.message ?? "목록 조회 실패" },
      { status: 500 }
    );
  }
}
