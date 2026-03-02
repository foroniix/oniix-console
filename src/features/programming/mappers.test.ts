import { describe, expect, it } from "vitest";
import { formatDateTime, parseTags, toIsoOrThrow, toLocalDateTimeInput } from "./mappers";

describe("programming mappers", () => {
  it("parses tags from comma separated input", () => {
    expect(parseTags("news, sport , , prime")).toEqual(["news", "sport", "prime"]);
  });

  it("throws on invalid iso conversion", () => {
    expect(() => toIsoOrThrow("invalid-date")).toThrow();
  });

  it("returns empty local input for missing date", () => {
    expect(toLocalDateTimeInput(null)).toBe("");
  });

  it("formats invalid date as dash", () => {
    expect(formatDateTime("not-a-date")).toBe("-");
  });
});
