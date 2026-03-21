import { describe, expect, it } from "vitest";
import { validateProgramForm, validateReplayForm, validateSlotForm } from "./validators";
import { emptyProgramForm, emptyReplayForm, emptySlotForm, NONE_VALUE } from "./types";

describe("programming validators", () => {
  it("rejects empty program title", () => {
    const form = emptyProgramForm();
    form.title = "   ";
    expect(validateProgramForm(form)).toBe("Le titre du programme est requis.");
  });

  it("rejects slot end before start", () => {
    const form = emptySlotForm("p1");
    form.channelId = "c1";
    form.startsAt = "2026-03-01T12:00";
    form.endsAt = "2026-03-01T11:00";
    expect(validateSlotForm(form)).toBe("La date de fin doit etre superieure a la date de debut.");
  });

  it("rejects a slot without channel", () => {
    const form = emptySlotForm("p1");
    form.channelId = NONE_VALUE;
    form.startsAt = "2026-03-01T12:00";
    form.endsAt = "2026-03-01T13:00";
    expect(validateSlotForm(form)).toBe("La chaine de diffusion est requise.");
  });

  it("rejects a slot without end time", () => {
    const form = emptySlotForm("p1");
    form.channelId = "c1";
    form.startsAt = "2026-03-01T12:00";
    form.endsAt = "";
    expect(validateSlotForm(form)).toBe("La date de fin est requise.");
  });

  it("rejects published replay without hls", () => {
    const form = emptyReplayForm();
    form.title = "Replay";
    form.status = "published";
    form.hlsUrl = "   ";
    expect(validateReplayForm(form)).toBe("Une URL HLS est requise pour publier un replay.");
  });

  it("rejects invalid replay duration", () => {
    const form = emptyReplayForm();
    form.title = "Replay";
    form.durationSec = "-5";
    expect(validateReplayForm(form)).toBe("La duree du replay est invalide.");
  });
});
