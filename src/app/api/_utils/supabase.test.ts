import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { supabaseAdmin } from "./supabase";

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
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {};

    expect(() => supabaseAdmin()).toThrow();

    if (hadWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
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
