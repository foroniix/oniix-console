import type {
  Channel,
  ProgramSlot,
  ProgramSlotStatus,
  ProgramSlotVisibility,
} from "@/lib/data";

const NO_CHANNEL_KEY = "__no_channel__";

type SlotChannel = ProgramSlot["channel"];
type SlotProgram = ProgramSlot["program"];

export type ProgrammingGridSlot = Pick<
  ProgramSlot,
  "id" | "programId" | "channelId" | "startsAt" | "endsAt" | "slotStatus" | "visibility" | "notes"
> & {
  channel?: SlotChannel;
  program?: SlotProgram;
};

export type ProgrammingGridEntry = {
  id: string;
  programId: string;
  channelId: string | null;
  title: string;
  poster: string | null;
  startsAt: string;
  endsAt: string | null;
  startMs: number;
  endMs: number | null;
  renderStartMs: number;
  renderEndMs: number;
  slotStatus: ProgramSlotStatus;
  visibility: ProgramSlotVisibility;
  notes: string | null;
};

export type ProgrammingGridLane = {
  channelId: string | null;
  channelName: string;
  channelLogo: string | null;
  entries: ProgrammingGridEntry[];
};

export type ChannelNowNext = {
  channelId: string | null;
  channelName: string;
  channelLogo: string | null;
  now: ProgrammingGridEntry | null;
  next: ProgrammingGridEntry | null;
};

type ChannelRef = Pick<Channel, "id" | "name" | "logo">;

type BuildProgrammingGridArgs = {
  slots: ProgrammingGridSlot[];
  channels?: ChannelRef[];
  windowStart: string | Date;
  windowEnd: string | Date;
  channelId?: string | null;
  statusFilter?: ProgramSlotStatus[];
  visibilityFilter?: "all" | ProgramSlotVisibility;
  minRenderMinutes?: number;
};

type BuildChannelNowNextArgs = {
  slots: ProgrammingGridSlot[];
  channels?: ChannelRef[];
  at: string | Date;
  channelId?: string | null;
  statusFilter?: ProgramSlotStatus[];
  visibilityFilter?: "all" | ProgramSlotVisibility;
};

function toMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  const ms = parsed.getTime();
  if (Number.isNaN(ms)) return null;
  return ms;
}

function slotKey(channelId: string | null | undefined): string {
  return channelId ?? NO_CHANNEL_KEY;
}

function laneOrderMap(channels?: ChannelRef[]) {
  const order = new Map<string, number>();
  (channels ?? []).forEach((channel, index) => {
    order.set(channel.id, index);
  });
  return order;
}

function resolveLaneIdentity(args: {
  key: string;
  channelMap: Map<string, ChannelRef>;
  fallbackChannel?: SlotChannel;
}) {
  if (args.key === NO_CHANNEL_KEY) {
    return {
      channelId: null,
      channelName: "Sans chaine",
      channelLogo: null,
    };
  }

  const channel = args.channelMap.get(args.key);
  if (channel) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo ?? null,
    };
  }

  return {
    channelId: args.fallbackChannel?.id ?? args.key,
    channelName: args.fallbackChannel?.name ?? "Chaine",
    channelLogo: args.fallbackChannel?.logo ?? null,
  };
}

type LaneIdentity = {
  channelId: string | null;
  channelName: string;
};

function sortLanes<T extends LaneIdentity>(lanes: T[], channels?: ChannelRef[]) {
  const orderMap = laneOrderMap(channels);

  return [...lanes].sort((a, b) => {
    if (a.channelId === null && b.channelId === null) return 0;
    if (a.channelId === null) return 1;
    if (b.channelId === null) return -1;

    const orderA = orderMap.get(a.channelId);
    const orderB = orderMap.get(b.channelId);
    if (typeof orderA === "number" && typeof orderB === "number") return orderA - orderB;
    if (typeof orderA === "number") return -1;
    if (typeof orderB === "number") return 1;

    return a.channelName.localeCompare(b.channelName, "fr");
  });
}

function sortEntries(entries: ProgrammingGridEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    if (a.endMs === null && b.endMs === null) return 0;
    if (a.endMs === null) return 1;
    if (b.endMs === null) return -1;
    return a.endMs - b.endMs;
  });
}

export function buildProgrammingGrid(args: BuildProgrammingGridArgs): ProgrammingGridLane[] {
  const windowStartMs = toMs(args.windowStart);
  const windowEndMs = toMs(args.windowEnd);
  if (windowStartMs === null || windowEndMs === null || windowEndMs <= windowStartMs) return [];

  const minRenderMinutes = Math.max(5, args.minRenderMinutes ?? 15);
  const minRenderMs = minRenderMinutes * 60_000;

  const statusFilter = new Set<ProgramSlotStatus>(args.statusFilter ?? ["scheduled", "published"]);
  const visibilityFilter = args.visibilityFilter ?? "all";

  const channelMap = new Map((args.channels ?? []).map((channel) => [channel.id, channel]));
  const lanes = new Map<string, ProgrammingGridLane>();

  for (const slot of args.slots) {
    if (args.channelId && slot.channelId !== args.channelId) continue;
    if (!statusFilter.has(slot.slotStatus)) continue;
    if (visibilityFilter !== "all" && slot.visibility !== visibilityFilter) continue;

    const startMs = toMs(slot.startsAt);
    if (startMs === null) continue;

    const hasEnd = Boolean(slot.endsAt);
    const endMs = toMs(slot.endsAt);
    if (hasEnd && endMs === null) continue;
    if (endMs !== null && endMs <= startMs) continue;

    const overlapEndMs = endMs ?? Number.POSITIVE_INFINITY;
    if (startMs >= windowEndMs || overlapEndMs <= windowStartMs) continue;

    const renderStartMs = Math.max(startMs, windowStartMs);
    const unclampedRenderEndMs = Math.min(endMs ?? windowEndMs, windowEndMs);
    const renderEndMs = Math.max(
      Math.min(windowEndMs, renderStartMs + minRenderMs),
      unclampedRenderEndMs
    );

    const laneKey = slotKey(slot.channelId);
    const laneIdentity = resolveLaneIdentity({
      key: laneKey,
      channelMap,
      fallbackChannel: slot.channel,
    });

    if (!lanes.has(laneKey)) {
      lanes.set(laneKey, {
        ...laneIdentity,
        entries: [],
      });
    }

    lanes.get(laneKey)!.entries.push({
      id: slot.id,
      programId: slot.programId,
      channelId: slot.channelId ?? null,
      title: slot.program?.title ?? "Programme",
      poster: slot.program?.poster ?? null,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt ?? null,
      startMs,
      endMs,
      renderStartMs,
      renderEndMs,
      slotStatus: slot.slotStatus,
      visibility: slot.visibility,
      notes: slot.notes ?? null,
    });
  }

  const laneList = [...lanes.values()].map((lane) => ({
    ...lane,
    entries: sortEntries(lane.entries),
  }));
  return sortLanes(laneList, args.channels);
}

export function buildChannelNowNext(args: BuildChannelNowNextArgs): ChannelNowNext[] {
  const atMs = toMs(args.at);
  if (atMs === null) return [];

  const statusFilter = new Set<ProgramSlotStatus>(args.statusFilter ?? ["published"]);
  const visibilityFilter = args.visibilityFilter ?? "public";

  const channelMap = new Map((args.channels ?? []).map((channel) => [channel.id, channel]));
  const grouped = new Map<string, ProgrammingGridEntry[]>();
  const laneMeta = new Map<string, { channelId: string | null; channelName: string; channelLogo: string | null }>();

  for (const slot of args.slots) {
    if (args.channelId && slot.channelId !== args.channelId) continue;
    if (!statusFilter.has(slot.slotStatus)) continue;
    if (visibilityFilter !== "all" && slot.visibility !== visibilityFilter) continue;

    const startMs = toMs(slot.startsAt);
    if (startMs === null) continue;

    const hasEnd = Boolean(slot.endsAt);
    const endMs = toMs(slot.endsAt);
    if (hasEnd && endMs === null) continue;
    if (endMs !== null && endMs <= startMs) continue;

    const key = slotKey(slot.channelId);
    if (!grouped.has(key)) grouped.set(key, []);

    const identity = resolveLaneIdentity({
      key,
      channelMap,
      fallbackChannel: slot.channel,
    });
    laneMeta.set(key, identity);

    grouped.get(key)!.push({
      id: slot.id,
      programId: slot.programId,
      channelId: slot.channelId ?? null,
      title: slot.program?.title ?? "Programme",
      poster: slot.program?.poster ?? null,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt ?? null,
      startMs,
      endMs,
      renderStartMs: startMs,
      renderEndMs: endMs ?? startMs,
      slotStatus: slot.slotStatus,
      visibility: slot.visibility,
      notes: slot.notes ?? null,
    });
  }

  const lanes: ChannelNowNext[] = [];
  for (const [key, entriesRaw] of grouped.entries()) {
    const entries = sortEntries(entriesRaw);
    const now = entries
      .filter((entry) => entry.startMs <= atMs && (entry.endMs === null || entry.endMs > atMs))
      .at(-1) ?? null;
    const next = entries.find((entry) => entry.startMs > atMs) ?? null;
    const identity = laneMeta.get(key) ?? resolveLaneIdentity({ key, channelMap });

    lanes.push({
      ...identity,
      now,
      next,
    });
  }

  return sortLanes(lanes, args.channels).map((lane) => ({
    channelId: lane.channelId,
    channelName: lane.channelName,
    channelLogo: lane.channelLogo,
    now: lane.now ?? null,
    next: lane.next ?? null,
  }));
}
