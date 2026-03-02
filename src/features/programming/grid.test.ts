import { describe, expect, it } from "vitest";
import { buildChannelNowNext, buildProgrammingGrid, type ProgrammingGridSlot } from "./grid";

const channels = [
  { id: "c1", name: "Info 24", logo: null },
  { id: "c2", name: "Sports Live", logo: null },
];

const slots: ProgrammingGridSlot[] = [
  {
    id: "s0",
    programId: "p0",
    channelId: "c1",
    startsAt: "2026-03-01T07:30:00.000Z",
    endsAt: "2026-03-01T08:20:00.000Z",
    slotStatus: "published",
    visibility: "public",
    notes: null,
    program: { id: "p0", title: "Wake Up", poster: null, status: "published" },
  },
  {
    id: "s1",
    programId: "p1",
    channelId: "c1",
    startsAt: "2026-03-01T08:20:00.000Z",
    endsAt: "2026-03-01T09:00:00.000Z",
    slotStatus: "published",
    visibility: "public",
    notes: null,
    program: { id: "p1", title: "Morning News", poster: null, status: "published" },
  },
  {
    id: "s2",
    programId: "p2",
    channelId: "c1",
    startsAt: "2026-03-01T09:00:00.000Z",
    endsAt: "2026-03-01T10:00:00.000Z",
    slotStatus: "published",
    visibility: "public",
    notes: null,
    program: { id: "p2", title: "Economy", poster: null, status: "published" },
  },
  {
    id: "s3",
    programId: "p3",
    channelId: "c1",
    startsAt: "2026-03-01T10:00:00.000Z",
    endsAt: "2026-03-01T10:30:00.000Z",
    slotStatus: "published",
    visibility: "private",
    notes: null,
    program: { id: "p3", title: "Backstage", poster: null, status: "published" },
  },
  {
    id: "s4",
    programId: "p4",
    channelId: "c2",
    startsAt: "2026-03-01T08:45:00.000Z",
    endsAt: "2026-03-01T09:15:00.000Z",
    slotStatus: "scheduled",
    visibility: "public",
    notes: null,
    program: { id: "p4", title: "Pre-match", poster: null, status: "scheduled" },
  },
];

describe("programming grid helpers", () => {
  it("builds lanes and clamps slots to the requested window", () => {
    const lanes = buildProgrammingGrid({
      slots,
      channels,
      windowStart: "2026-03-01T08:00:00.000Z",
      windowEnd: "2026-03-01T10:00:00.000Z",
      visibilityFilter: "public",
      statusFilter: ["published", "scheduled"],
    });

    expect(lanes.length).toBe(2);

    const infoLane = lanes.find((lane) => lane.channelId === "c1");
    expect(infoLane).toBeTruthy();
    expect(infoLane?.entries.map((entry) => entry.id)).toEqual(["s0", "s1", "s2"]);
    expect(infoLane?.entries[0].renderStartMs).toBe(Date.parse("2026-03-01T08:00:00.000Z"));
  });

  it("computes now and next entries per channel", () => {
    const rows = buildChannelNowNext({
      slots,
      channels,
      at: "2026-03-01T08:30:00.000Z",
      visibilityFilter: "public",
      statusFilter: ["published", "scheduled"],
    });

    const infoRow = rows.find((row) => row.channelId === "c1");
    expect(infoRow?.now?.id).toBe("s1");
    expect(infoRow?.next?.id).toBe("s2");

    const sportsRow = rows.find((row) => row.channelId === "c2");
    expect(sportsRow?.now).toBeNull();
    expect(sportsRow?.next?.id).toBe("s4");
  });
});

