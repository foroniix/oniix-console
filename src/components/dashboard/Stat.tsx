import { ReactNode } from "react";


type StatProps = { label: string; value: ReactNode; icon?: ReactNode };


export function Stat({ label, value, icon }: StatProps) {
return (
<div className="rounded-2xl border border-white/10 bg-[#0d0f14] p-5 flex items-center gap-4 shadow-xl shadow-black/20">
{icon && (
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-white text-xl">
{icon}
</div>
)}
<div>
<div className="text-sm text-zinc-400 tracking-wide">{label}</div>
<div className="text-2xl font-bold text-white leading-tight">{value}</div>
</div>
</div>
);
}

