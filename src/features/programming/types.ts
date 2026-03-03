import type {
  Channel,
  Program,
  ProgramSlot,
  ProgramSlotStatus,
  ProgramSlotVisibility,
  ProgramStatus,
  Replay,
  ReplayStatus,
  Stream,
} from "@/lib/data";

export const NONE_VALUE = "__none__";

export type TabKey = "grid" | "programs" | "slots" | "replays";

export const PROGRAM_STATUS_VALUES: ProgramStatus[] = [
  "draft",
  "scheduled",
  "published",
  "cancelled",
];

export const SLOT_STATUS_VALUES: ProgramSlotStatus[] = [
  "scheduled",
  "published",
  "cancelled",
];

export const SLOT_VISIBILITY_VALUES: ProgramSlotVisibility[] = ["public", "private"];

export const REPLAY_STATUS_VALUES: ReplayStatus[] = [
  "draft",
  "processing",
  "ready",
  "published",
  "archived",
];

export type ProgramFormState = {
  id: string | null;
  title: string;
  channelId: string;
  status: ProgramStatus;
  synopsis: string;
  category: string;
  poster: string;
  tags: string;
};

export type SlotFormState = {
  id: string | null;
  programId: string;
  channelId: string;
  startsAt: string;
  endsAt: string;
  status: ProgramSlotStatus;
  visibility: ProgramSlotVisibility;
  notes: string;
};

export type ReplayFormState = {
  id: string | null;
  title: string;
  streamId: string;
  channelId: string;
  hlsUrl: string;
  synopsis: string;
  poster: string;
  durationSec: string;
  status: ReplayStatus;
  availableFrom: string;
  availableTo: string;
};

export type ProgrammingStats = {
  programs: number;
  slots: number;
  replays: number;
  publishedPrograms: number;
  publishedSlots: number;
  publishedReplays: number;
};

export type Feedback = {
  kind: "success" | "error";
  message: string;
};

export type ProgrammingCollections = {
  channels: Channel[];
  streams: Stream[];
  programs: Program[];
  slots: ProgramSlot[];
  replays: Replay[];
};

export function emptyProgramForm(): ProgramFormState {
  return {
    id: null,
    title: "",
    channelId: NONE_VALUE,
    status: "draft",
    synopsis: "",
    category: "",
    poster: "",
    tags: "",
  };
}

export function emptySlotForm(programId = ""): SlotFormState {
  return {
    id: null,
    programId,
    channelId: NONE_VALUE,
    startsAt: "",
    endsAt: "",
    status: "scheduled",
    visibility: "public",
    notes: "",
  };
}

export function emptyReplayForm(): ReplayFormState {
  return {
    id: null,
    title: "",
    streamId: NONE_VALUE,
    channelId: NONE_VALUE,
    hlsUrl: "",
    synopsis: "",
    poster: "",
    durationSec: "",
    status: "draft",
    availableFrom: "",
    availableTo: "",
  };
}
