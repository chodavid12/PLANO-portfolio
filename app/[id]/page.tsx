import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoSlider from "../_components/PhotoSlider";
import { getProjectById } from "@/lib/projects";
import { MATERIAL_CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id).catch(() => null);
  if (!project) notFound();

  const grouped = MATERIAL_CATEGORIES.map((category) => ({
    category,
    names: project.materials
      .filter((m) => m.category === category)
      .map((m) => m.material_name),
  })).filter((g) => g.names.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-5">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        ← 목록으로
      </Link>

      <h1 className="mb-5 text-lg font-bold text-ink sm:text-xl">
        {project.site_name}
      </h1>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="order-1 md:order-2 md:w-[60%]">
          <PhotoSlider photos={project.photos} />
        </div>

        <div className="order-2 md:order-1 md:w-[40%]">
          <h2 className="mb-3 text-sm font-semibold text-muted">마감재</h2>
          {grouped.length === 0 ? (
            <p className="text-sm text-muted">등록된 마감재가 없습니다.</p>
          ) : (
            <dl className="divide-y divide-gray-100 rounded-xl bg-white ring-1 ring-black/5">
              {grouped.map((g) => (
                <div key={g.category} className="flex gap-3 px-4 py-3">
                  <dt className="w-16 flex-none text-sm font-semibold text-ink">
                    {g.category}
                  </dt>
                  <dd className="text-sm leading-relaxed text-gray-700">
                    {g.names.join(" / ")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </main>
  );
}
