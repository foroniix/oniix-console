import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { supabaseAdmin } from "./supabase";

type GlobalWithOptionalWindow = typeof globalThis & {
  window?: unknown;
};

function walk(dir: string, files: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

describe("supabaseAdmin", () => {
  it("throws in browser context", () => {
    const globalWithWindow = globalThis as GlobalWithOptionalWindow;
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
    const originalWindow = globalWithWindow.window;
    globalWithWindow.window = {};

    expect(() => supabaseAdmin()).toThrow();

    if (hadWindow) {
      globalWithWindow.window = originalWindow;
    } else {
      delete globalWithWindow.window;
    }
  });

  it("is only used in allowed routes", () => {
    const apiRoot = path.join(process.cwd(), "src", "app", "api");
    const routeFiles = walk(apiRoot).filter((file) => file.endsWith("route.ts"));
    const allowed = new Set([
      "src/app/api/auth/signup/route.ts",
      "src/app/api/users/route.ts",
      "src/app/api/users/[id]/route.ts",
      "src/app/api/users/[id]/link/route.ts",
      "src/app/api/analytics/ingest/route.ts",
      "src/app/api/analytics/collect/route.ts",
      "src/app/api/analytics/heartbeat/route.ts",
      "src/app/api/analytics/live/route.ts",
      "src/app/api/analytics/stats/route.ts",
      "src/app/api/ads/decide/route.ts",
      "src/app/api/ads/decision/route.ts",
      "src/app/api/ads/event/route.ts",
      "src/app/api/mobile/program-grid/route.ts",
      "src/app/api/mobile/ingest-token/route.ts",
      "src/app/api/mobile/playback-url/route.ts",
      "src/app/api/playback/hls/[channelId]/[file]/route.ts",
      "src/app/api/web/auth/signup/route.ts",
      "src/app/api/web/catalog/route.ts",
      "src/app/api/web/catalog/[titleId]/route.ts",
      "src/app/api/web/catalog/playback-url/route.ts",
      "src/app/api/web/live/route.ts",
      "src/app/api/web/live/playback-url/route.ts",
      "src/app/api/web/me/library/route.ts",
      "src/app/api/web/me/watch-progress/route.ts",
      "src/app/api/web/me/watchlist/route.ts",
      "src/app/api/tenant/workspaces/route.ts",
      "src/app/api/replays/process/cron/route.ts",
      "src/app/api/superadmin/channel-backfill/route.ts",
      "src/app/api/superadmin/overview/route.ts",
      "src/app/api/superadmin/tenants/route.ts",
    ]);

    const offenders = routeFiles
      .filter((file) => {
        const text = fs.readFileSync(file, "utf-8");
        return text.includes("supabaseAdmin");
      })
      .map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/"))
      .filter((rel) => !allowed.has(rel));

    expect(offenders).toEqual([]);
  });
});
