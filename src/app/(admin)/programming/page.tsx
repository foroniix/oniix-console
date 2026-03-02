"use client";

import { CalendarClock, ChevronRight, RefreshCw } from "lucide-react";
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="fixed inset-0 -z-10 bg-zinc-950" />
      <div className="fixed inset-0 -z-10 opacity-70 [background:radial-gradient(900px_circle_at_15%_0%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(16,185,129,0.08),transparent_55%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Console</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>Broadcast</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-white">Programmation</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <CalendarClock className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                    Programmation OTT
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Programmes a suivre, planning des slots et replays HLS.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => void vm.loadAll(true)}
              className="h-9 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${vm.refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {vm.loadError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {vm.loadError}
          </div>
        ) : null}

        {vm.feedback ? (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              vm.feedback.kind === "error"
                ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <Tabs value={vm.tab} onValueChange={(value) => vm.setTab(value as typeof vm.tab)}>
            <TabsList className="bg-zinc-950/40 border-white/10">
              <TabsTrigger value="grid">Grille</TabsTrigger>
              <TabsTrigger value="programs">Programmes</TabsTrigger>
              <TabsTrigger value="slots">A suivre</TabsTrigger>
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
                busyAction={vm.busyAction}
                onPatch={vm.patchReplayForm}
                onSave={vm.saveReplay}
                onReset={vm.resetReplayForm}
                onEdit={vm.startEditReplay}
                onPublish={vm.publishReplayById}
                onDelete={vm.deleteReplayById}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
