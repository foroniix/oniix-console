"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


type ConcurrentPoint = { t: string; concurrent: number };


export function LineConcurrent({ data }: { data: ConcurrentPoint[] }) {
return (
<div className="h-64 w-full rounded-2xl border border-white/10 bg-[#0d0f14] p-4 shadow-xl shadow-black/20 backdrop-blur-md">
<ResponsiveContainer>
<LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
<CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
<XAxis dataKey="t" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<Tooltip contentStyle={{ background: "#0f1217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />
<Line type="monotone" dataKey="concurrent" stroke="#34D399" strokeWidth={2} dot={false} />
</LineChart>
</ResponsiveContainer>
</div>
);
}