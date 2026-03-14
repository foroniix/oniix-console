"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, RefreshCw, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TenantListItem = {
  id: string;
  name: string;
  created_at: string | null;
  owner_email: string | null;
  members_count: number;
  streams_count: number;
  live_streams_count: number;
  events_24h: number;
  ingest_configured: boolean;
  status: "active" | "idle";
};

type TenantsResponse = {
  ok: true;
  generated_at: string;
  total: number;
  tenants: TenantListItem[];
};

function dateTimeFormat(value: string | null) {
  if (!value) return "--";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";
  return new Date(parsed).toLocaleString("fr-FR");
}

function numberFormat(value: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(value);
  } catch {
    return String(value);
  }
}

export default function TenantsPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createOwnerEmail, setCreateOwnerEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (soft = false, filter = "") => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "180");
      if (filter.trim()) params.set("q", filter.trim());
      const res = await fetch(`/api/superadmin/tenants?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as
        | TenantsResponse
        | { ok?: false; error?: string }
        | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible de charger les tenants.");
        return;
      }
      setItems(json.tenants ?? []);
    } catch {
      setError("Erreur réseau sur la liste des tenants.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false, "");
  }, [load]);

  const onSubmitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(q);
    void load(true, q);
  };

  const onCreateTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!createName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          ownerEmail: createOwnerEmail.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error || "Impossible de créer le tenant.");
        return;
      }
      setCreateName("");
      setCreateOwnerEmail("");
      setOpenCreate(false);
      await load(true, search);
    } catch {
      setError("Erreur réseau sur la création de tenant.");
    } finally {
      setCreating(false);
    }
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.members += item.members_count;
        acc.streams += item.streams_count;
        acc.liveStreams += item.live_streams_count;
        acc.events24h += item.events_24h;
        if (item.ingest_configured) acc.ingestConfigured += 1;
        if (item.status === "active") acc.active += 1;
        return acc;
      },
      {
        members: 0,
        streams: 0,
        liveStreams: 0,
        events24h: 0,
        ingestConfigured: 0,
        active: 0,
      }
    );
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-transparent to-primary/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Tenants</h1>
            <Badge className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20">
              SaaS Portfolio
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">
            Gestion complète des éditeurs TV, adoption et santé de provisioning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => load(true, search)}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Nouveau tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Créer un tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreateTenant} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Nom du tenant</label>
                  <Input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Ex: Vision Africa Media"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Email owner (optionnel)</label>
                  <Input
                    type="email"
                    value={createOwnerEmail}
                    onChange={(event) => setCreateOwnerEmail(event.target.value)}
                    placeholder="owner@tenant.com"
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
                  Si un owner email est fourni, une invitation est envoyée automatiquement.
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Creer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenants actifs</CardDescription>
            <CardTitle>{numberFormat(totals.active)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Membres</CardDescription>
            <CardTitle>{numberFormat(totals.members)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Streams</CardDescription>
            <CardTitle>
              {numberFormat(totals.liveStreams)} / {numberFormat(totals.streams)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Événements 24h</CardDescription>
            <CardTitle>{numberFormat(totals.events24h)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingest configuré</CardDescription>
            <CardTitle>{numberFormat(totals.ingestConfigured)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Registry multi-tenant</CardTitle>
            <CardDescription>
              Recherche, supervision business et capacite operationnelle par editeur.
            </CardDescription>
          </div>
          <form onSubmit={onSubmitSearch} className="flex gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Rechercher un tenant..."
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-zinc-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Chargement des tenants...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
              Aucun tenant trouve.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Streams</TableHead>
                  <TableHead className="text-right">Événements 24h</TableHead>
                  <TableHead className="text-right">Ingest</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Creation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium text-white">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        {tenant.name}
                      </span>
                    </TableCell>
                    <TableCell>{tenant.owner_email ?? "--"}</TableCell>
                    <TableCell className="text-right">{numberFormat(tenant.members_count)}</TableCell>
                    <TableCell className="text-right">
                      {numberFormat(tenant.live_streams_count)} / {numberFormat(tenant.streams_count)}
                    </TableCell>
                    <TableCell className="text-right">{numberFormat(tenant.events_24h)}</TableCell>
                    <TableCell className="text-right">
                      {tenant.ingest_configured ? (
                        <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline">A configurer</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.status === "active" ? (
                        <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="outline">Idle</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-zinc-400">
                      {dateTimeFormat(tenant.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-zinc-200">
            <Sparkles className="size-4 text-primary" />
            Standard SaaS: onboarding rapide, observabilite live, gouvernance role-based.
          </div>
          <Button asChild variant="outline">
            <a href="/system">Voir la santé système</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
