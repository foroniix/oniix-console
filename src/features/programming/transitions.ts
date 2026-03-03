import type { ProgramSlotStatus, ProgramStatus, ReplayStatus } from "@/lib/data";

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
  draft: ["draft", "processing", "ready", "published", "archived"],
  processing: ["processing", "ready", "archived"],
  ready: ["ready", "draft", "processing", "published", "archived"],
  published: ["published", "archived"],
  archived: ["archived", "ready", "processing"],
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
