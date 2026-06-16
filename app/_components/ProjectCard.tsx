import Link from "next/link";
import type { Project } from "@/lib/types";

export default function ProjectCard({ project }: { project: Project }) {
  const thumbnail = project.photos[0]?.url;
  const tags = project.materials.slice(0, 3);

  return (
    <Link
      href={`/${project.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={project.site_name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            사진 없음
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {project.site_name}
        </h3>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-muted"
              >
                {t.material_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
