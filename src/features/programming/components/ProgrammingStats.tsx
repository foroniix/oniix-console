import { ListChecks } from "lucide-react";
import type { ProgrammingStats } from "../types";

type ProgrammingStatsProps = {
  stats: ProgrammingStats;
};

function StatCard(props: { title: string; total: number; published: number }) {
  const { title, total, published } = props;
  return (
    <div className="console-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">{title}</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/70 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
          <ListChecks className="h-3.5 w-3.5" />
          Publiés {published}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{total}</div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">État courant du catalogue</p>
    </div>
  );
}

export function ProgrammingStatsCards({ stats }: ProgrammingStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Programmes" total={stats.programs} published={stats.publishedPrograms} />
      <StatCard title="À suivre" total={stats.slots} published={stats.publishedSlots} />
      <StatCard title="Replays" total={stats.replays} published={stats.publishedReplays} />
    </div>
  );
}
