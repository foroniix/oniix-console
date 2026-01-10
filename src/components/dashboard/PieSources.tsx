"use client";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";


type SourceItem = { source: string; value: number };


const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F472B6", "#94A3B8"];


export function PieSources({ data }: { data: SourceItem[] }) {
return (
<div className="h-64 w-full rounded-2xl border border-white/10 bg-[#0d0f14] p-4 shadow-xl shadow-black/20 backdrop-blur-md">
<ResponsiveContainer>
<PieChart>
<Pie data={data} dataKey="value" nameKey="source" innerRadius={55} outerRadius={85} stroke="none">
{data.map((_: SourceItem, i: number) => (
<Cell key={i} fill={COLORS[i % COLORS.length]} />
))}
</Pie>
<Tooltip contentStyle={{ background: "#0f1217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />
<Legend verticalAlign="bottom" height={30} wrapperStyle={{ color: "#e5e7eb" }} />
</PieChart>
</ResponsiveContainer>
</div>
);
}