import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_utils/supabase";

export async function GET() {
  try {
    const s = supabaseAdmin();
    const { data, error } = await s.from("channels").select("id").limit(1);
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok:true, sample: data ?? [] });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
