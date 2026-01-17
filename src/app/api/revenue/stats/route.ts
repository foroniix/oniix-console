import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function periodToRange(period: string) {
  const now = new Date();
  const end = now.toISOString();

  const start = new Date(now);
  if (period === "7d") start.setDate(start.getDate() - 7);
  else if (period === "30d") start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 1); // 24h

  return { start: start.toISOString(), end };
}

function safeNumber(n: any) {
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

export async function GET(req: Request) {
  try {
    const query = parseQuery(
      req,
      z.object({
        period: z.string().optional(),
      })
    );
    if (!query.ok) return query.res;
    const period = (query.data.period || "24h") as "24h" | "7d" | "30d";
    const { start, end } = periodToRange(period);

    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const tenantErr = await requireTenant(ctx);
    if (tenantErr) return tenantErr;

    const sb = supabaseUser(ctx.accessToken);

    const tenant_id = ctx.tenantId as string;

    const { data: rows, error: rErr } = await sb
      .from("celtiis_subscriptions")
      .select("amount, created_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", start)
      .lte("created_at", end);

    if (rErr) {
      console.error("Revenue stats error", { error: rErr.message, tenantId: tenant_id });
      return NextResponse.json(
        {
          ok: true,
          period,
          currency: "XOF",
          totals: { totalRevenue: 0, totalTransactions: 0, arpu: 0 },
          series: [],
          warning: "Donnees indisponibles pour le moment.",
        },
        { status: 200 }
      );
    }

    const list = Array.isArray(rows) ? rows : [];

    const totalRevenue = list.reduce((acc, r: any) => acc + safeNumber(r.amount), 0);
    const totalTransactions = list.length;

    // Approximation: revenue / transactions (use a better source if available).
    const arpu = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const bucketKey = (iso: string) => {
      const d = new Date(iso);
      if (period === "24h") return `${String(d.getHours()).padStart(2, "0")}:00`;
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const buckets = new Map<string, { revenue: number; transactions: number }>();
    for (const r of list) {
      const key = bucketKey(r.created_at);
      const prev = buckets.get(key) || { revenue: 0, transactions: 0 };
      prev.revenue += safeNumber(r.amount);
      prev.transactions += 1;
      buckets.set(key, prev);
    }

    const series = Array.from(buckets.entries()).map(([time, v]) => ({
      time,
      revenue: Math.round(v.revenue),
      transactions: v.transactions,
    }));

    return NextResponse.json(
      {
        ok: true,
        period,
        currency: "XOF",
        totals: {
          totalRevenue: Math.round(totalRevenue),
          totalTransactions,
          arpu,
        },
        series,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Revenue stats crash", { error: e?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
