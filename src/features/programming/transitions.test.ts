import { describe, expect, it } from "vitest";
import {
  canTransitionProgramStatus,
  canTransitionReplayStatus,
  canTransitionSlotStatus,
} from "./transitions";

describe("programming transitions", () => {
  it("accepts valid program transitions", () => {
    expect(canTransitionProgramStatus("draft", "published")).toBe(true);
    expect(canTransitionProgramStatus("cancelled", "scheduled")).toBe(true);
  });

  it("rejects invalid program transitions", () => {
    expect(canTransitionProgramStatus("published", "draft")).toBe(false);
    expect(canTransitionProgramStatus("cancelled", "published")).toBe(false);
  });

  it("rejects invalid slot transitions", () => {
    expect(canTransitionSlotStatus("cancelled", "published")).toBe(false);
  });

  it("rejects invalid replay transitions", () => {
    expect(canTransitionReplayStatus("archived", "published")).toBe(false);
    expect(canTransitionReplayStatus("published", "ready")).toBe(false);
  });
});
