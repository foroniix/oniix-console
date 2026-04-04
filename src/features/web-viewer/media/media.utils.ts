import { WEB_MEDIA_FALLBACKS } from "./media.constants";

function cleanMediaUrl(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function pickMediaUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const url = cleanMediaUrl(candidate);
    if (url) return url;
  }
  return null;
}

export function pickLiveArtwork(slotPoster?: string | null, streamPoster?: string | null) {
  return pickMediaUrl(slotPoster, streamPoster, WEB_MEDIA_FALLBACKS.live);
}

export function pickReplayArtwork(replayPoster?: string | null) {
  return pickMediaUrl(replayPoster, WEB_MEDIA_FALLBACKS.replay);
}

export function pickPosterArtwork(poster?: string | null, backdrop?: string | null) {
  return pickMediaUrl(poster, backdrop, WEB_MEDIA_FALLBACKS.poster);
}

export function pickTitleStageArtwork(options: {
  episodeThumbnail?: string | null;
  episodePoster?: string | null;
  titleBackdrop?: string | null;
  titlePoster?: string | null;
  fallback?: string | null;
}) {
  return pickMediaUrl(
    options.episodeThumbnail,
    options.episodePoster,
    options.titleBackdrop,
    options.titlePoster,
    options.fallback ?? WEB_MEDIA_FALLBACKS.hero
  );
}
