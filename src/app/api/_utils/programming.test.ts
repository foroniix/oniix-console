import { describe, expect, it } from "vitest";
import {
  canTransitionProgramStatus,
  canTransitionReplayStatus,
  canTransitionSlotStatus,
  deriveProgramStatusFromSlotStatus,
  isSlotActive,
  windowsOverlap,
} from "./programming";

describe("programming status transitions", () => {
  it("allows valid program transitions", () => {
    expect(canTransitionProgramStatus("draft", "published")).toBe(true);
    expect(canTransitionProgramStatus("scheduled", "published")).toBe(true);
  });

  it("rejects invalid program transitions", () => {
    expect(canTransitionProgramStatus("published", "draft")).toBe(false);
    expect(canTransitionProgramStatus("cancelled", "published")).toBe(false);
  });

  it("rejects invalid slot transitions", () => {
    expect(canTransitionSlotStatus("cancelled", "published")).toBe(false);
  });

  it("rejects invalid replay transitions", () => {
    expect(canTransitionReplayStatus("published", "ready")).toBe(false);
    expect(canTransitionReplayStatus("archived", "published")).toBe(false);
  });

  it("promotes the program status when a slot is scheduled or published", () => {
    expect(deriveProgramStatusFromSlotStatus("draft", "scheduled")).toBe("scheduled");
    expect(deriveProgramStatusFromSlotStatus("draft", "published")).toBe("published");
    expect(deriveProgramStatusFromSlotStatus("scheduled", "published")).toBe("published");
    expect(deriveProgramStatusFromSlotStatus("published", "scheduled")).toBe("published");
  });
});

describe("programming time windows", () => {
  it("detects overlap for finite windows", () => {
    expect(
      windowsOverlap(
        { startsAt: "2026-03-01T10:00:00.000Z", endsAt: "2026-03-01T11:00:00.000Z" },
        { startsAt: "2026-03-01T10:30:00.000Z", endsAt: "2026-03-01T12:00:00.000Z" }
      )
    ).toBe(true);
  });

  it("does not overlap when touching the boundary only", () => {
    expect(
      windowsOverlap(
        { startsAt: "2026-03-01T10:00:00.000Z", endsAt: "2026-03-01T11:00:00.000Z" },
        { startsAt: "2026-03-01T11:00:00.000Z", endsAt: "2026-03-01T12:00:00.000Z" }
      )
    ).toBe(false);
  });

  it("handles open-ended windows", () => {
    expect(
      windowsOverlap(
        { startsAt: "2026-03-01T10:00:00.000Z", endsAt: null },
        { startsAt: "2026-03-01T20:00:00.000Z", endsAt: "2026-03-01T21:00:00.000Z" }
      )
    ).toBe(true);
  });
});

describe("slot active helper", () => {
  it("returns false for cancelled slots", () => {
    expect(isSlotActive("cancelled", null, "2026-03-01T12:00:00.000Z")).toBe(false);
  });

  it("returns true for ongoing scheduled slot", () => {
    expect(isSlotActive("scheduled", "2026-03-01T13:00:00.000Z", "2026-03-01T12:00:00.000Z")).toBe(
      true
    );
  });
});
