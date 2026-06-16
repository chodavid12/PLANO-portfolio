"use client";

import { useRef, useState } from "react";
import type { Photo } from "@/lib/types";

export default function PhotoSlider({ photos }: { photos: Photo[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100 text-muted">
        사진 없음
      </div>
    );
  }

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(i, photos.length - 1));
    track.scrollTo({ left: track.clientWidth * clamped, behavior: "smooth" });
    setActive(clamped);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActive(idx);
  }

  return (
    <div className="relative w-full">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto rounded-xl"
      >
        {photos.map((p, i) => (
          <div key={i} className="w-full flex-none snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`사진 ${i + 1}`}
              className="aspect-square w-full bg-gray-100 object-cover sm:aspect-[4/3]"
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            onClick={() => scrollToIndex(active - 1)}
            aria-label="이전 사진"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white sm:block"
          >
            ‹
          </button>
          <button
            onClick={() => scrollToIndex(active + 1)}
            aria-label="다음 사진"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white sm:block"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`${i + 1}번째 사진으로 이동`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
