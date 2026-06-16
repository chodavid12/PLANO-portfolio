"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSync() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(`동기화 실패: ${data.errors?.[0] ?? "오류"}`);
      } else {
        const errPart =
          data.errors?.length > 0 ? ` (오류 ${data.errors.length}건)` : "";
        showToast(`${data.synced}건 동기화 완료${errPart}`);
        router.refresh();
      }
    } catch (e: any) {
      showToast(`동기화 실패: ${e?.message ?? "네트워크 오류"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        aria-label="노션 동기화"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-2xl text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-70"
      >
        {loading ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          "🔄"
        )}
      </button>

      {toast && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
