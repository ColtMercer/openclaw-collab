export function Card({ title, value, subtitle, className = "" }: {
  title: string; value: string; subtitle?: string; className?: string;
}) {
  return (
    <div className={`bg-[#141420] border border-[#27272a] rounded-xl p-5 ${className}`}>
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}
