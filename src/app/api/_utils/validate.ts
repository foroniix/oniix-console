import { NextResponse } from "next/server";
import { z } from "zod";

type ValidationOk<T> = { ok: true; data: T };
type ValidationErr = { ok: false; res: NextResponse };
type ValidationResult<T> = ValidationOk<T> | ValidationErr;

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

export async function parseJson<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: invalidResponse() };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, res: invalidResponse() };
  return { ok: true, data: parsed.data };
}

export function parseQuery<T>(req: Request, schema: z.ZodSchema<T>): ValidationResult<T> {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, res: invalidResponse() };
  return { ok: true, data: parsed.data };
}
