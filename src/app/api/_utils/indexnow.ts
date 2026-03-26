const SITE_URL = "https://oniix.space";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY?.trim() || "oniix-indexnow-20260326";

function absolute(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function getIndexNowKey() {
  return INDEXNOW_KEY;
}

export function getIndexNowKeyLocation() {
  return absolute(`/${INDEXNOW_KEY}.txt`);
}

export function buildCatalogIndexNowUrls(playableId: string) {
  return [
    absolute("/"),
    absolute("/streaming"),
    absolute("/films-series"),
    absolute("/we/catalog"),
    absolute(`/we/catalog/${playableId}`),
  ];
}

export function buildReplayIndexNowUrls(replayId: string) {
  return [
    absolute("/"),
    absolute("/streaming"),
    absolute("/tv-live"),
    absolute("/sport-live"),
    absolute(`/we/replays/${replayId}`),
  ];
}

export async function notifyIndexNow(urls: string[]) {
  const uniqueUrls = Array.from(
    new Set(
      urls
        .map((item) => item.trim())
        .filter((item) => item.startsWith(SITE_URL))
    )
  );

  if (uniqueUrls.length === 0) return;

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: "oniix.space",
        key: INDEXNOW_KEY,
        keyLocation: getIndexNowKeyLocation(),
        urlList: uniqueUrls,
      }),
    });

    if (!response.ok) {
      console.error("indexnow_submit_failed", {
        status: response.status,
        urls: uniqueUrls,
      });
    }
  } catch (error) {
    console.error("indexnow_submit_error", { error, urls: uniqueUrls });
  }
}
