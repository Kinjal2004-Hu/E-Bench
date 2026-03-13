import Link from "next/link";

export default function TrendingWidget({
  title,
  items,
  linked = false,
}: {
  title: string;
  items: string[];
  linked?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-slate-600">
            {linked ? (
              <Link href="/community" className="transition hover:text-slate-900">
                {item}
              </Link>
            ) : (
              item
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
