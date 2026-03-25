const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

const accentBar = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  purple: 'bg-violet-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
};

/** e.g. CUSTOMER → Customer */
function roleLabel(typeName) {
  if (!typeName) return "";
  const s = String(typeName).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @param {object} props
 * @param {Array<{ type_name?: string, count: number }>} [props.breakdown] — user counts by role (compact chips)
 * @param {Array<{ period: string, value: string, hint?: string }>} [props.sections] — stacked periods (e.g. today / month); replaces single value + subValue
 * @param {{ label: string, value: string }} [props.equalFooter] — second block with same typography as main value (e.g. today’s revenue)
 */
export default function StatCard({
  label,
  value,
  subValue,
  breakdown,
  sections,
  equalFooter,
  icon: Icon,
  color = "blue",
}) {
  const bar = accentBar[color] || accentBar.blue;
  const hasSections = sections && sections.length > 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500/90">
            {label}
          </p>
          {hasSections ? (
            <div className="mt-2.5 space-y-3">
              {sections.map((seg, idx) => (
                <div
                  key={seg.period}
                  className={idx > 0 ? "border-t border-gray-100 pt-3" : ""}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {seg.period}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">
                    {seg.value}
                  </p>
                  {seg.hint ? (
                    <p className="mt-0.5 text-xs leading-snug text-gray-500">{seg.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">
                {value}
              </p>
              {subValue && !breakdown?.length ? (
                <p className="mt-1 text-xs leading-snug text-gray-600">{subValue}</p>
              ) : null}
            </>
          )}
          {breakdown && breakdown.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {breakdown.map((row) => (
                <span
                  key={row.type_name || row.label}
                  className="inline-flex items-baseline gap-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
                >
                  <span className="font-semibold tabular-nums text-gray-900">
                    {row.count}
                  </span>
                  <span className="text-gray-500">{roleLabel(row.type_name || row.label)}</span>
                </span>
              ))}
            </div>
          ) : null}
          {equalFooter && !hasSections ? (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {equalFooter.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">
                {equalFooter.value}
              </p>
            </div>
          ) : null}
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorMap[color] || colorMap.blue}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}
