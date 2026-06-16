"use client";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="현장명 또는 자재명으로 검색"
        className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-gray-400"
      />
    </div>
  );
}
