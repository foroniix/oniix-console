import { ListChecks } from "lucide-react";
import type { ProgrammingStats } from "../types";

type ProgrammingStatsProps = {
  stats: ProgrammingStats;
};

function StatCard(props: { title: string; total: number; published: number }) {
  const { title, total, published } = props;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        <span className="text-xs px-2 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-100 inline-flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-indigo-300" />
          Publies {published}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{total}</div>
      <p className="mt-1 text-xs text-zinc-500">Etat courant du catalogue</p>
    </div>
  );
}

export function ProgrammingStatsCards({ stats }: ProgrammingStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Programmes" total={stats.programs} published={stats.publishedPrograms} />
      <StatCard title="A suivre" total={stats.slots} published={stats.publishedSlots} />
      <StatCard title="Replays" total={stats.replays} published={stats.publishedReplays} />
    </div>
  );
}
