import { NextResponse } from "next/server";
import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

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
    const url = new URL(req.url);
    const period = (url.searchParams.get("period") || "24h") as "24h" | "7d" | "30d";
    const { start, end } = periodToRange(period);

    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const sb = supabaseUser(ctx.accessToken);

    const tenant_id = ctx.tenantId;

    if (!tenant_id) {
      // si tu passes plutôt par tenant_memberships, remplace ici par une requête membership
      return NextResponse.json({ ok: true, period, currency: "XOF", totals: { totalRevenue: 0, totalTransactions: 0, arpu: 0 }, series: [] }, { status: 200 });
    }

    /**
     * ✅ SOURCE REVENUE (à adapter)
     * J'assume une table `celtiis_subscriptions` avec :
     * - tenant_id (uuid)
     * - amount (numeric/int)
     * - created_at (timestamptz)
     *
     * Si ta table/colonnes diffèrent, dis-moi le schéma et je te l’aligne.
     */
    const { data: rows, error: rErr } = await sb
      .from("celtiis_subscriptions")
      .select("amount, created_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", start)
      .lte("created_at", end);

    if (rErr) {
      // Important : on renvoie un payload stable, même en erreur data
      return NextResponse.json(
        {
          ok: true,
          period,
          currency: "XOF",
          totals: { totalRevenue: 0, totalTransactions: 0, arpu: 0 },
          series: [],
          warning: rErr.message,
        },
        { status: 200 }
      );
    }

    const list = Array.isArray(rows) ? rows : [];

    const totalRevenue = list.reduce((acc, r: any) => acc + safeNumber(r.amount), 0);
    const totalTransactions = list.length;

    // ARPU : si tu as une table users par tenant, on peut mieux faire.
    // Là : approximation = revenue / transactions (pas un vrai ARPU). Tu peux renommer en "Avg ticket".
    const arpu = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Série simple : bucket par jour (7d/30d) ou par heure (24h)
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
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
