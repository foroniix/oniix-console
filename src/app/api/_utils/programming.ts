export type ProgramStatus = "draft" | "scheduled" | "published" | "cancelled";
export type ProgramSlotStatus = "scheduled" | "published" | "cancelled";
export type ReplayStatus = "draft" | "ready" | "published" | "archived";

type StatusMap<T extends string> = Record<T, readonly T[]>;

const PROGRAM_TRANSITIONS: StatusMap<ProgramStatus> = {
  draft: ["draft", "scheduled", "published", "cancelled"],
  scheduled: ["scheduled", "draft", "published", "cancelled"],
  published: ["published", "cancelled"],
  cancelled: ["cancelled", "draft", "scheduled"],
};

const SLOT_TRANSITIONS: StatusMap<ProgramSlotStatus> = {
  scheduled: ["scheduled", "published", "cancelled"],
  published: ["published", "cancelled"],
  cancelled: ["cancelled", "scheduled"],
};

const REPLAY_TRANSITIONS: StatusMap<ReplayStatus> = {
  draft: ["draft", "ready", "published", "archived"],
  ready: ["ready", "draft", "published", "archived"],
  published: ["published", "archived"],
  archived: ["archived"],
};

function canTransition<T extends string>(map: StatusMap<T>, current: T, next: T) {
  return map[current].includes(next);
}

export function canTransitionProgramStatus(current: ProgramStatus, next: ProgramStatus) {
  return canTransition(PROGRAM_TRANSITIONS, current, next);
}

export function canTransitionSlotStatus(current: ProgramSlotStatus, next: ProgramSlotStatus) {
  return canTransition(SLOT_TRANSITIONS, current, next);
}

export function canTransitionReplayStatus(current: ReplayStatus, next: ReplayStatus) {
  return canTransition(REPLAY_TRANSITIONS, current, next);
}

type TimeWindow = {
  startsAt: string;
  endsAt: string | null;
};

function toMs(value: string) {
  return new Date(value).getTime();
}

function toEndMs(value: string | null) {
  return value ? toMs(value) : Number.POSITIVE_INFINITY;
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow) {
  const aStart = toMs(a.startsAt);
  const bStart = toMs(b.startsAt);
  const aEnd = toEndMs(a.endsAt);
  const bEnd = toEndMs(b.endsAt);

  if (
    !Number.isFinite(aStart) ||
    !Number.isFinite(bStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bEnd)
  ) {
    return false;
  }

  return aStart < bEnd && bStart < aEnd;
}

export function isSlotActive(slotStatus: ProgramSlotStatus, endsAt: string | null, nowIso: string) {
  if (slotStatus === "cancelled") return false;
  if (!endsAt) return true;

  const endMs = toMs(endsAt);
  const nowMs = toMs(nowIso);
  if (!Number.isFinite(endMs) || !Number.isFinite(nowMs)) return false;
  return endMs > nowMs;
}
