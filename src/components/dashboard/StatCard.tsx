type StatCardProps = {
title: string;
value: string | number;
hint?: string;
delta?: number;
className?: string;
};


export function StatCard({ title, value, hint, delta, className }: StatCardProps) {
return (
<div className={`rounded-2xl border border-white/10 bg-[#0d0f14] p-5 shadow-xl shadow-black/20 ${className || ""}`}>
<h3 className="text-sm text-zinc-400 tracking-wide">{title}</h3>
<p className="text-3xl font-bold text-white mt-1">{value}</p>
{hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
{typeof delta === "number" && (
<p className={`mt-2 text-sm ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
{delta >= 0 ? "+" : ""}{delta}%
</p>
)}
</div>
);
}