import Link from "next/link";

type TrendingItem = string | { label: string; href: string };

export default function TrendingWidget({
  title,
  items,
  linked = false,
}: {
  title: string;
  items: TrendingItem[];
  linked?: boolean;
}) {
  return (
    <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-3 text-base font-semibold text-[#1C2333]">{title}</h3>
      <ul>
        {items.map((item, index) => {
          const label = typeof item === "string" ? item : item.label;
          const href = typeof item === "string" ? "/community" : item.href;

          return (
          <li
            key={`${label}-${index}`}
            className={`flex items-center justify-between py-1.5 text-sm text-[#666] ${
              index === items.length - 1 ? "" : "border-b border-gray-100"
            }`}
          >
            {linked ? (
              <Link href={href} className="transition hover:text-[#1C2333]">
                {label}
              </Link>
            ) : (
              label
            )}
            <span className="text-[#888]">›</span>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
