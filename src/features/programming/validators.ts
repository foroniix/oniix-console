import type { ProgramFormState, ReplayFormState, SlotFormState } from "./types";

export function validateProgramForm(form: ProgramFormState): string | null {
  if (!form.title.trim()) {
    return "Le titre du programme est requis.";
  }
  return null;
}

export function validateSlotForm(form: SlotFormState): string | null {
  if (!form.programId.trim()) {
    return "Le programme est requis pour un slot.";
  }
  if (!form.startsAt.trim()) {
    return "La date de debut est requise.";
  }
  if (form.endsAt.trim()) {
    const startMs = new Date(form.startsAt).getTime();
    const endMs = new Date(form.endsAt).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return "Les dates du slot sont invalides.";
    }
    if (endMs <= startMs) {
      return "La date de fin doit etre superieure a la date de debut.";
    }
  }
  return null;
}

export function validateReplayForm(form: ReplayFormState): string | null {
  if (!form.title.trim()) {
    return "Le titre du replay est requis.";
  }
  if (form.status === "published" && !form.hlsUrl.trim()) {
    return "Une URL HLS est requise pour publier un replay.";
  }
  if (form.durationSec.trim()) {
    const duration = Number(form.durationSec);
    if (!Number.isFinite(duration) || duration < 0) {
      return "La duree du replay est invalide.";
    }
  }
  if (form.availableFrom.trim() && form.availableTo.trim()) {
    const fromMs = new Date(form.availableFrom).getTime();
    const toMs = new Date(form.availableTo).getTime();
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
      return "Les dates de disponibilite sont invalides.";
    }
    if (toMs <= fromMs) {
      return "La fin de disponibilite doit etre apres le debut.";
    }
  }
  return null;
}
