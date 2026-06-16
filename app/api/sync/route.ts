import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { synced: 0, errors: [e?.message ?? "동기화 실패"] },
      { status: 500 }
    );
  }
}
