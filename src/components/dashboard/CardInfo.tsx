import { ReactNode } from "react";


type CardInfoProps = { title: string; content: ReactNode };


export function CardInfo({ title, content }: CardInfoProps) {
return (
<div className="h-48 w-full rounded-2xl bg-[#0d0f14] border border-white/10 p-5 shadow-xl shadow-black/20 hover:scale-[1.02] transition-all cursor-default">
<div className="text-sm text-zinc-400 tracking-wide">{title}</div>
<div className="mt-4 text-2xl font-bold text-white leading-tight">{content}</div>
</div>
);
}