import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listChannels,
  listProgramSlots,
  listPrograms,
  listReplays,
  listStreams,
  publishProgram,
  publishProgramSlot,
  publishReplay,
  removeProgram,
  removeProgramSlot,
  removeReplay,
  upsertProgram,
  upsertProgramSlot,
  upsertReplay,
  type Channel,
  type Program,
  type ProgramSlot,
  type Replay,
  type Stream,
} from "@/lib/data";
import { parseTags, toIsoOrThrow, toLocalDateTimeInput } from "../mappers";
import {
  emptyProgramForm,
  emptyReplayForm,
  emptySlotForm,
  NONE_VALUE,
  PROGRAM_STATUS_VALUES,
  REPLAY_STATUS_VALUES,
  SLOT_STATUS_VALUES,
  type Feedback,
  type ProgramFormState,
  type ProgrammingStats,
  type ReplayFormState,
  type SlotFormState,
  type TabKey,
} from "../types";
import {
  canTransitionProgramStatus,
  canTransitionReplayStatus,
  canTransitionSlotStatus,
} from "../transitions";
import { validateProgramForm, validateReplayForm, validateSlotForm } from "../validators";

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const idx = items.findIndex((it) => it.id === next.id);
  if (idx < 0) return [next, ...items];
  const copy = [...items];
  copy[idx] = next;
  return copy;
}

function sortSlotsByStart(items: ProgramSlot[]): ProgramSlot[] {
  return [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

const GENERIC_ERROR_MESSAGES = new Set([
  "Une erreur est survenue.",
  "Operation indisponible.",
  "Configuration indisponible.",
]);

function resolveActionErrorMessage(fallback: string, err?: unknown) {
  if (!err || !(err instanceof Error)) return fallback;

  const message = err.message.trim();
  if (!message) return fallback;
  if (message.startsWith("Request failed")) return fallback;
  if (GENERIC_ERROR_MESSAGES.has(message)) return fallback;

  return message;
}

export function useProgramming() {
  const [tab, setTab] = useState<TabKey>("grid");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [slots, setSlots] = useState<ProgramSlot[]>([]);
  const [replays, setReplays] = useState<Replay[]>([]);

  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm());
  const [slotForm, setSlotForm] = useState<SlotFormState>(emptySlotForm());
  const [replayForm, setReplayForm] = useState<ReplayFormState>(emptyReplayForm());

  const [savingProgram, setSavingProgram] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingReplay, setSavingReplay] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadError, setLoadError] = useState("");

  const setErrorFeedback = useCallback((fallbackMessage: string, err?: unknown) => {
    if (err) console.error(err);
    setFeedback({ kind: "error", message: resolveActionErrorMessage(fallbackMessage, err) });
  }, []);

  const setSuccessFeedback = useCallback((message: string) => {
    setFeedback({ kind: "success", message });
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const resetProgramForm = useCallback(() => {
    setProgramForm(emptyProgramForm());
  }, []);

  const resetSlotForm = useCallback((programId = "") => {
    setSlotForm(emptySlotForm(programId));
  }, []);

  const resetReplayForm = useCallback(() => {
    setReplayForm(emptyReplayForm());
  }, []);

  const patchProgramForm = useCallback((patch: Partial<ProgramFormState>) => {
    setProgramForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchSlotForm = useCallback((patch: Partial<SlotFormState>) => {
    setSlotForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchReplayForm = useCallback((patch: Partial<ReplayFormState>) => {
    setReplayForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadAll = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setLoadError("");
    try {
      const [programsRes, slotsRes, replaysRes, channelsRes, streamsRes] =
        await Promise.allSettled([
          listPrograms(),
          listProgramSlots(),
          listReplays(),
          listChannels(),
          listStreams(),
        ]);

      const failedResources: string[] = [];

      if (programsRes.status === "fulfilled") {
        setPrograms(programsRes.value);
        if (programsRes.value.length > 0) {
          setSlotForm((prev) => (prev.programId ? prev : { ...prev, programId: programsRes.value[0].id }));
        }
      } else {
        failedResources.push("programmes");
        setPrograms([]);
      }

      if (slotsRes.status === "fulfilled") {
        setSlots(slotsRes.value);
      } else {
        failedResources.push("slots");
        setSlots([]);
      }

      if (replaysRes.status === "fulfilled") {
        setReplays(replaysRes.value);
      } else {
        failedResources.push("replays");
        setReplays([]);
      }

      if (channelsRes.status === "fulfilled") {
        setChannels(channelsRes.value);
      } else {
        failedResources.push("chaines");
        setChannels([]);
      }

      if (streamsRes.status === "fulfilled") {
        setStreams(streamsRes.value);
      } else {
        failedResources.push("streams");
        setStreams([]);
      }

      if (failedResources.length > 0) {
        const coreFailure =
          failedResources.includes("programmes") &&
          failedResources.includes("slots") &&
          failedResources.includes("replays");

        if (coreFailure) {
          setLoadError("Impossible de charger la programmation.");
        } else {
          setFeedback({
            kind: "error",
            message: `Chargement partiel: ${failedResources.join(", ")} indisponibles.`,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setLoadError("Impossible de charger la programmation.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const stats = useMemo<ProgrammingStats>(() => {
    return {
      programs: programs.length,
      slots: slots.length,
      replays: replays.length,
      publishedPrograms: programs.filter((p) => p.status === "published").length,
      publishedSlots: slots.filter((s) => s.slotStatus === "published").length,
      publishedReplays: replays.filter((r) => r.replayStatus === "published").length,
    };
  }, [programs, slots, replays]);

  const editingProgram = useMemo(
    () => (programForm.id ? programs.find((item) => item.id === programForm.id) ?? null : null),
    [programForm.id, programs]
  );
  const editingSlot = useMemo(
    () => (slotForm.id ? slots.find((item) => item.id === slotForm.id) ?? null : null),
    [slotForm.id, slots]
  );
  const editingReplay = useMemo(
    () => (replayForm.id ? replays.find((item) => item.id === replayForm.id) ?? null : null),
    [replayForm.id, replays]
  );

  const programStatusOptions = useMemo(() => {
    if (!editingProgram) return PROGRAM_STATUS_VALUES;
    return PROGRAM_STATUS_VALUES.filter((status) =>
      canTransitionProgramStatus(editingProgram.status, status)
    );
  }, [editingProgram]);

  const slotStatusOptions = useMemo(() => {
    if (!editingSlot) return SLOT_STATUS_VALUES;
    return SLOT_STATUS_VALUES.filter((status) =>
      canTransitionSlotStatus(editingSlot.slotStatus, status)
    );
  }, [editingSlot]);

  const replayStatusOptions = useMemo(() => {
    if (!editingReplay) return REPLAY_STATUS_VALUES;
    return REPLAY_STATUS_VALUES.filter((status) =>
      canTransitionReplayStatus(editingReplay.replayStatus, status)
    );
  }, [editingReplay]);

  const saveProgram = useCallback(async () => {
    const validationError = validateProgramForm(programForm);
    if (validationError) {
      setErrorFeedback(validationError);
      return;
    }

    setSavingProgram(true);
    try {
      const saved = await upsertProgram({
        id: programForm.id || undefined,
        title: programForm.title.trim(),
        channelId: programForm.channelId === NONE_VALUE ? null : programForm.channelId,
        status: programForm.status,
        synopsis: programForm.synopsis.trim() || null,
        category: programForm.category.trim() || null,
        poster: programForm.poster.trim() || null,
        tags: parseTags(programForm.tags),
      });

      setPrograms((prev) => upsertById(prev, saved));
      setSlotForm((prev) => (prev.programId ? prev : { ...prev, programId: saved.id }));
      resetProgramForm();

      setSuccessFeedback(programForm.id ? "Programme mis a jour." : "Programme cree.");
    } catch (err) {
      setErrorFeedback("Impossible d'enregistrer le programme.", err);
    } finally {
      setSavingProgram(false);
    }
  }, [programForm, resetProgramForm, setErrorFeedback, setSuccessFeedback]);

  const saveSlot = useCallback(async () => {
    const validationError = validateSlotForm(slotForm);
    if (validationError) {
      setErrorFeedback(validationError);
      return;
    }

    setSavingSlot(true);
    try {
      const saved = await upsertProgramSlot({
        id: slotForm.id || undefined,
        programId: slotForm.programId,
        channelId: slotForm.channelId === NONE_VALUE ? null : slotForm.channelId,
        startsAt: toIsoOrThrow(slotForm.startsAt),
        endsAt: slotForm.endsAt ? toIsoOrThrow(slotForm.endsAt) : null,
        slotStatus: slotForm.status,
        visibility: slotForm.visibility,
        notes: slotForm.notes.trim() || null,
      });

      setSlots((prev) => sortSlotsByStart(upsertById(prev, saved)));
      resetSlotForm(slotForm.programId);

      setSuccessFeedback(slotForm.id ? "Slot mis a jour." : "Slot cree.");
    } catch (err) {
      setErrorFeedback("Impossible d'enregistrer le slot.", err);
    } finally {
      setSavingSlot(false);
    }
  }, [resetSlotForm, setErrorFeedback, setSuccessFeedback, slotForm]);

  const saveReplay = useCallback(async () => {
    const validationError = validateReplayForm(replayForm);
    if (validationError) {
      setErrorFeedback(validationError);
      return;
    }

    const duration =
      replayForm.durationSec.trim().length > 0 ? Number(replayForm.durationSec.trim()) : null;

    setSavingReplay(true);
    try {
      const saved = await upsertReplay({
        id: replayForm.id || undefined,
        title: replayForm.title.trim(),
        streamId: replayForm.streamId === NONE_VALUE ? null : replayForm.streamId,
        channelId: replayForm.channelId === NONE_VALUE ? null : replayForm.channelId,
        replayStatus: replayForm.status,
        hlsUrl: replayForm.hlsUrl.trim() || null,
        synopsis: replayForm.synopsis.trim() || null,
        poster: replayForm.poster.trim() || null,
        durationSec: duration,
        availableFrom: replayForm.availableFrom ? toIsoOrThrow(replayForm.availableFrom) : null,
        availableTo: replayForm.availableTo ? toIsoOrThrow(replayForm.availableTo) : null,
      });

      setReplays((prev) => upsertById(prev, saved));
      resetReplayForm();

      setSuccessFeedback(replayForm.id ? "Replay mis a jour." : "Replay cree.");
    } catch (err) {
      setErrorFeedback("Impossible d'enregistrer le replay.", err);
    } finally {
      setSavingReplay(false);
    }
  }, [replayForm, resetReplayForm, setErrorFeedback, setSuccessFeedback]);

  const startEditProgram = useCallback((program: Program) => {
    setProgramForm({
      id: program.id,
      title: program.title || "",
      channelId: program.channelId || NONE_VALUE,
      status: program.status || "draft",
      synopsis: program.synopsis || "",
      category: program.category || "",
      poster: program.poster || "",
      tags: (program.tags || []).join(", "),
    });
    setTab("programs");
  }, []);

  const startEditSlot = useCallback((slot: ProgramSlot) => {
    setSlotForm({
      id: slot.id,
      programId: slot.programId,
      channelId: slot.channelId || NONE_VALUE,
      startsAt: toLocalDateTimeInput(slot.startsAt),
      endsAt: toLocalDateTimeInput(slot.endsAt),
      status: slot.slotStatus || "scheduled",
      visibility: slot.visibility || "public",
      notes: slot.notes || "",
    });
    setTab("slots");
  }, []);

  const startEditReplay = useCallback((replay: Replay) => {
    setReplayForm({
      id: replay.id,
      title: replay.title || "",
      streamId: replay.streamId || NONE_VALUE,
      channelId: replay.channelId || NONE_VALUE,
      hlsUrl: replay.hlsUrl || "",
      synopsis: replay.synopsis || "",
      poster: replay.poster || "",
      durationSec:
        typeof replay.durationSec === "number" && Number.isFinite(replay.durationSec)
          ? String(replay.durationSec)
          : "",
      status: replay.replayStatus || "draft",
      availableFrom: toLocalDateTimeInput(replay.availableFrom),
      availableTo: toLocalDateTimeInput(replay.availableTo),
    });
    setTab("replays");
  }, []);

  const doBusyAction = useCallback(
    async <T>(key: string, run: () => Promise<T>): Promise<T | null> => {
      setBusyAction(key);
      try {
        return await run();
      } catch (err) {
        throw err;
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  const publishProgramById = useCallback(
    async (id: string) => {
      try {
        const saved = await doBusyAction(`program:${id}:publish`, () => publishProgram(id));
        if (!saved) return;
        setPrograms((prev) => upsertById(prev, saved));
        setSuccessFeedback("Programme publie.");
      } catch (err) {
        setErrorFeedback("Impossible de publier le programme.", err);
      }
    },
    [doBusyAction, setErrorFeedback, setSuccessFeedback]
  );

  const publishSlotById = useCallback(
    async (id: string) => {
      try {
        const saved = await doBusyAction(`slot:${id}:publish`, () => publishProgramSlot(id));
        if (!saved) return;
        setSlots((prev) => upsertById(prev, saved));
        await loadAll(true);
        setSuccessFeedback("Slot publie.");
      } catch (err) {
        setErrorFeedback("Impossible de publier le slot.", err);
      }
    },
    [doBusyAction, loadAll, setErrorFeedback, setSuccessFeedback]
  );

  const publishReplayById = useCallback(
    async (id: string) => {
      try {
        const saved = await doBusyAction(`replay:${id}:publish`, () => publishReplay(id));
        if (!saved) return;
        setReplays((prev) => upsertById(prev, saved));
        setSuccessFeedback("Replay publie.");
      } catch (err) {
        setErrorFeedback("Impossible de publier le replay.", err);
      }
    },
    [doBusyAction, setErrorFeedback, setSuccessFeedback]
  );

  const deleteProgramById = useCallback(
    async (id: string) => {
      try {
        await doBusyAction(`program:${id}:delete`, () => removeProgram(id));
        setPrograms((prev) => prev.filter((item) => item.id !== id));
        setSlots((prev) => prev.filter((item) => item.programId !== id));
        setProgramForm((prev) => (prev.id === id ? emptyProgramForm() : prev));
        setSuccessFeedback("Programme supprime.");
      } catch (err) {
        setErrorFeedback("Impossible de supprimer le programme.", err);
      }
    },
    [doBusyAction, setErrorFeedback, setSuccessFeedback]
  );

  const deleteSlotById = useCallback(
    async (id: string) => {
      try {
        await doBusyAction(`slot:${id}:delete`, () => removeProgramSlot(id));
        setSlots((prev) => prev.filter((item) => item.id !== id));
        setSlotForm((prev) => (prev.id === id ? emptySlotForm(prev.programId) : prev));
        setSuccessFeedback("Slot supprime.");
      } catch (err) {
        setErrorFeedback("Impossible de supprimer le slot.", err);
      }
    },
    [doBusyAction, setErrorFeedback, setSuccessFeedback]
  );

  const deleteReplayById = useCallback(
    async (id: string) => {
      try {
        await doBusyAction(`replay:${id}:delete`, () => removeReplay(id));
        setReplays((prev) => prev.filter((item) => item.id !== id));
        setReplayForm((prev) => (prev.id === id ? emptyReplayForm() : prev));
        setSuccessFeedback("Replay supprime.");
      } catch (err) {
        setErrorFeedback("Impossible de supprimer le replay.", err);
      }
    },
    [doBusyAction, setErrorFeedback, setSuccessFeedback]
  );

  return {
    tab,
    setTab,
    loading,
    refreshing,
    loadError,
    feedback,
    clearFeedback,
    channels,
    streams,
    programs,
    slots,
    replays,
    stats,
    programStatusOptions,
    slotStatusOptions,
    replayStatusOptions,
    programForm,
    slotForm,
    replayForm,
    savingProgram,
    savingSlot,
    savingReplay,
    busyAction,
    patchProgramForm,
    patchSlotForm,
    patchReplayForm,
    resetProgramForm,
    resetSlotForm,
    resetReplayForm,
    loadAll,
    saveProgram,
    saveSlot,
    saveReplay,
    startEditProgram,
    startEditSlot,
    startEditReplay,
    publishProgramById,
    publishSlotById,
    publishReplayById,
    deleteProgramById,
    deleteSlotById,
    deleteReplayById,
  };
}
