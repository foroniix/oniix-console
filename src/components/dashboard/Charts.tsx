"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


type ViewerPoint = { t: string; v: number };


export function ViewersArea({ data }: { data: ViewerPoint[] }) {
return (
<div className="h-64 w-full rounded-2xl border border-white/10 bg-[#0d0f14] p-4 shadow-xl shadow-black/20 backdrop-blur-md">
<ResponsiveContainer>
<AreaChart data={data}>
<defs>
<linearGradient id="vgrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
<stop offset="95%" stopColor="#60A5FA" stopOpacity={0.05} />
</linearGradient>
</defs>
<CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
<XAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} axisLine={false} dataKey="t" />
<YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
<Tooltip contentStyle={{ background: "#0f1217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />
<Area type="monotone" dataKey="v" stroke="#60A5FA" fill="url(#vgrad)" strokeWidth={2} />
</AreaChart>
</ResponsiveContainer>
</div>
);
}