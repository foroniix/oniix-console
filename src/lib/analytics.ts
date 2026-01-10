"use server";

import { supabase } from "./supabase";

export type KPIs = {
  activeUsers: number;
  newUsers: number;
  watchTimeMin: number;
  conversions: number;
  convRate: number;
};

export async function getKPIs(): Promise<KPIs> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { count: activeUsers } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .gte("last_active_at", since);

  const { count: newUsers } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  const { data: watch } = await supabase
    .from("app_users")
    .select("watch_time_min");

  const watchTimeMin =
    watch?.reduce((acc, u) => acc + (u.watch_time_min || 0), 0) ?? 0;

  // conversions fictives (ou remplace par ta table)
  const conversions = Math.floor(activeUsers! * 0.1);
  const convRate = conversions / (activeUsers! || 1);

  return {
    activeUsers: activeUsers ?? 0,
    newUsers: newUsers ?? 0,
    watchTimeMin,
    conversions,
    convRate,
  };
}

// 14 jours de séries utilisateurs / viewers
export async function getSeries(days: number) {
  const { data: snaps } = await supabase
    .from("stream_snapshots")
    .select("*")
    .order("ts");

  return snaps?.map(s => ({
    date: s.ts,
    users: Math.floor(Math.random() * 2000), // à remplacer par vraie data
    viewers: s.concurrent_viewers,
  })) ?? [];
}

// top chaînes
export async function getTopChannels() {
  const { data } = await supabase
    .from("channels")
    .select("*")
    .order("minutes_watched", { ascending: false })
    .limit(5);

  return (
    data?.map(c => ({
      label: c.name,
      value: c.minutes_watched,
      delta: c.delta_24h,
    })) ?? []
  );
}

// sources trafic
export async function getTrafficSources() {
  const { data } = await supabase.from("traffic_sources").select("*");

  return (
    data?.map(s => ({
      id: s.id,
      label: s.source,
      value: s.count,
    })) ?? []
  );
}

// retention
export async function getRetention() {
  const { data } = await supabase.from("retention").select("*");

  return (
    data?.map(r => ({
      day: `Jour ${r.day}`,
      rate: r.rate,
    })) ?? []
  );
}
