"use client";

import { CalendarClock, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GridSection } from "@/features/programming/components/GridSection";
import { ProgramSection } from "@/features/programming/components/ProgramSection";
import { ReplaySection } from "@/features/programming/components/ReplaySection";
import { SlotSection } from "@/features/programming/components/SlotSection";
import { ProgrammingStatsCards } from "@/features/programming/components/ProgrammingStats";
import { useProgramming } from "@/features/programming/hooks/useProgramming";

export default function ProgrammingPage() {
  const vm = useProgramming();

  return (
    <PageShell>
      <PageHeader
        title="Programmation"
        subtitle="Planifiez vos programmes, slots de diffusion et replays."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Programmation" },
        ]}
        icon={<CalendarClock className="size-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() => void vm.loadAll(true)}
            className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${vm.refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {vm.loadError ? (
        <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
          {vm.loadError}
        </div>
      ) : null}

      {vm.feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            vm.feedback.kind === "error"
              ? "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{vm.feedback.message}</span>
            <button className="text-xs opacity-80 hover:opacity-100" onClick={vm.clearFeedback}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      <ProgrammingStatsCards stats={vm.stats} />

      <div className="console-panel p-4 sm:p-5">
        <Tabs value={vm.tab} onValueChange={(value) => vm.setTab(value as typeof vm.tab)}>
          <TabsList>
            <TabsTrigger value="grid">Grille</TabsTrigger>
            <TabsTrigger value="programs">Programmes</TabsTrigger>
            <TabsTrigger value="slots">À suivre</TabsTrigger>
            <TabsTrigger value="replays">Replays</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            <GridSection
              loading={vm.loading}
              channels={vm.channels}
              slots={vm.slots}
              onEditSlot={vm.startEditSlot}
            />
          </TabsContent>

          <TabsContent value="programs" className="mt-4">
            <ProgramSection
              loading={vm.loading}
              channels={vm.channels}
              programs={vm.programs}
              form={vm.programForm}
              statusOptions={vm.programStatusOptions}
              saving={vm.savingProgram}
              busyAction={vm.busyAction}
              onPatch={vm.patchProgramForm}
              onSave={vm.saveProgram}
              onReset={vm.resetProgramForm}
              onEdit={vm.startEditProgram}
              onPublish={vm.publishProgramById}
              onDelete={vm.deleteProgramById}
            />
          </TabsContent>

          <TabsContent value="slots" className="mt-4">
            <SlotSection
              loading={vm.loading}
              programs={vm.programs}
              channels={vm.channels}
              slots={vm.slots}
              form={vm.slotForm}
              statusOptions={vm.slotStatusOptions}
              saving={vm.savingSlot}
              busyAction={vm.busyAction}
              onPatch={vm.patchSlotForm}
              onSave={vm.saveSlot}
              onReset={() => vm.resetSlotForm(vm.slotForm.programId)}
              onEdit={vm.startEditSlot}
              onPublish={vm.publishSlotById}
              onDelete={vm.deleteSlotById}
            />
          </TabsContent>

          <TabsContent value="replays" className="mt-4">
            <ReplaySection
              loading={vm.loading}
              channels={vm.channels}
              streams={vm.streams}
              replays={vm.replays}
              form={vm.replayForm}
              statusOptions={vm.replayStatusOptions}
              saving={vm.savingReplay}
              processingQueue={vm.processingReplayQueue}
              busyAction={vm.busyAction}
              onPatch={vm.patchReplayForm}
              onSave={vm.saveReplay}
              onProcessQueue={vm.processReplayQueue}
              onReset={vm.resetReplayForm}
              onEdit={vm.startEditReplay}
              onPublish={vm.publishReplayById}
              onDelete={vm.deleteReplayById}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
