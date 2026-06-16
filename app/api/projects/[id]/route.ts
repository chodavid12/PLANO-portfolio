import { NextResponse } from "next/server";
import { getProjectById } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await getProjectById(params.id);
    if (!project) {
      return NextResponse.json({ error: "찾을 수 없음" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "조회 실패" },
      { status: 500 }
    );
  }
}
