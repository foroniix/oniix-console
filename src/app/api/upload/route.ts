import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file manquant" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "image requise" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
    const ext = file.name.split(".").pop() || "png";
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const fname = `thumb_${hash}.${ext}`;
    const fpath = path.join(dir, fname);
    await writeFile(fpath, buf);
    return NextResponse.json({ url: `/uploads/${fname}` });
  } catch (e) {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}




