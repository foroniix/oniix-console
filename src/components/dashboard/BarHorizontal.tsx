"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


type HorizontalBarItem = { label: string; value: number; delta?: number };


export function BarHorizontal({ data }: { data: HorizontalBarItem[] }) {
return (
<div className="h-64 w-full rounded-2xl border border-white/10 bg-[#0d0f14] p-4 shadow-xl shadow-black/20 backdrop-blur-md">
<ResponsiveContainer>
<BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 0 }}>
<CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
<XAxis type="number" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<YAxis dataKey="label" type="category" width={110} stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<Tooltip contentStyle={{ background: "#0f1217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />
<Bar dataKey="value" fill="#60A5FA" radius={[10, 10, 10, 10]} />
</BarChart>
</ResponsiveContainer>
</div>
);
}