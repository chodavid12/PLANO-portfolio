import { NextResponse } from "next/server";
import { searchProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const projects = await searchProjects(q);
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json(
      { projects: [], error: e?.message ?? "검색 실패" },
      { status: 500 }
    );
  }
}
