// admin/src/app/api/utils/validate-hls/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return NextResponse.json({ ok:false, status:400 }, { status:400 });
  try {
    const r = await fetch(url as string, { method:'GET', redirect:'follow' });
    return NextResponse.json({ ok: r.status < 400, status: r.status });
  } catch {
    return NextResponse.json({ ok:false, status:0 }, { status:200 });
  }
}
