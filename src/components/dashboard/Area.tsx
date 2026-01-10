"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


type AreaUsersPoint = { t: string; users: number; [key: string]: any };


export function AreaUsers({ data, dataKey = "users", color = "#60A5FA" }: {
data: AreaUsersPoint[];
dataKey?: string;
color?: string;
}) {
return (
<div className="h-64 w-full rounded-2xl border border-white/10 bg-[#0d0f14] p-4 shadow-xl shadow-black/20 backdrop-blur-md">
<ResponsiveContainer>
<AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
<defs>
<linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor={color} stopOpacity={0.7} />
<stop offset="100%" stopColor={color} stopOpacity={0.05} />
</linearGradient>
</defs>
<CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
<XAxis dataKey="t" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
<Tooltip contentStyle={{ background: "#0f1217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />
<Area type="monotone" dataKey={dataKey} stroke={color} fill="url(#gradArea)" strokeWidth={2} />
</AreaChart>
</ResponsiveContainer>
</div>
);
}