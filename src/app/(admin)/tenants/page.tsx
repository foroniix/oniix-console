"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Users,
} from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CHANNEL_CATEGORIES = [
  "Sports",
  "Music",
  "Religion",
  "Documentaire",
  "Art",
  "Mode",
  "Faits Divers",
  "Anime",
  "Manga",
  "Autre",
] as const;

const ONBOARDING_STEP_LABELS = {
  owner: "administrateur",
  channel: "chaîne",
  source: "source",
  stream: "direct",
  ingest: "ingest",
} as const;

type OnboardingStep = keyof typeof ONBOARDING_STEP_LABELS;
type TenantStatus = "active" | "ready" | "setup";

type TenantListItem = {
  id: string;
  name: string;
  created_at: string | null;
  owner_email: string | null;
  members_count: number;
  channels_count: number;
  origin_configured: boolean;
  streams_count: number;
  live_streams_count: number;
  events_24h: number;
  ingest_configured: boolean;
  onboarding_completion: number;
  onboarding_total: number;
  missing_steps: OnboardingStep[];
  status: TenantStatus;
};

type TenantsResponse = {
  ok: true;
  tenants: TenantListItem[];
};

type CreateTenantResponse = {
  ok: true;
  tenant: { id: string; name: string };
  invited_owner: { email: string | null; user_id: string | null } | null;
  onboarding: {
    completion: number;
    total_steps: number;
    missing_steps: OnboardingStep[];
  };
  bootstrap: {
    channel: { name: string | null } | null;
    stream: { title: string } | null;
    ingest_key: string | null;
  };
  warnings: string[];
};

function dateTimeFormat(value: string | null) {
  if (!value) return "--";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(parsed));
}

function numberFormat(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatMissingSteps(steps: OnboardingStep[]) {
  if (steps.length === 0) return "Onboarding complet";
  return `A finaliser: ${steps.map((step) => ONBOARDING_STEP_LABELS[step]).join(", ")}`;
}

function TenantStatusBadge({ status }: { status: TenantStatus }) {
  if (status === "active") {
    return <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">Actif</Badge>;
  }
  if (status === "ready") {
    return <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-200">Prêt</Badge>;
  }
  return <Badge variant="outline">À compléter</Badge>;
}

export default function TenantsPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createOwnerEmail, setCreateOwnerEmail] = useState("");
  const [createChannelName, setCreateChannelName] = useState("");
  const [createChannelCategory, setCreateChannelCategory] = useState<(typeof CHANNEL_CATEGORIES)[number]>("Autre");
  const [createOriginHlsUrl, setCreateOriginHlsUrl] = useState("");
  const [createInitialStream, setCreateInitialStream] = useState(true);
  const [createStreamTitle, setCreateStreamTitle] = useState("");
  const [createProvisionIngest, setCreateProvisionIngest] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<CreateTenantResponse | null>(null);

  const load = useCallback(async (soft = false, filter = "") => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setLoadError("");

    try {
      const params = new URLSearchParams({ limit: "180" });
      if (filter.trim()) params.set("q", filter.trim());

      const res = await fetch(`/api/superadmin/tenants?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as TenantsResponse | { ok?: false; error?: string } | null;

      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setLoadError((json && "error" in json && json.error) || "Impossible de charger les éditeurs.");
        return;
      }

      setItems(json.tenants ?? []);
    } catch {
      setLoadError("Erreur réseau sur la liste des éditeurs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false, "");
  }, [load]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.active += item.status === "active" ? 1 : 0;
          acc.ready += item.onboarding_completion >= item.onboarding_total ? 1 : 0;
          acc.members += item.members_count;
          acc.channels += item.channels_count;
          acc.streams += item.streams_count;
          acc.liveStreams += item.live_streams_count;
          acc.events24h += item.events_24h;
          acc.origins += item.origin_configured ? 1 : 0;
          return acc;
        },
        { active: 0, ready: 0, members: 0, channels: 0, streams: 0, liveStreams: 0, events24h: 0, origins: 0 }
      ),
    [items]
  );

  const onSubmitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = q.trim();
    setSearch(nextSearch);
    void load(true, nextSearch);
  };

  const clearSearch = () => {
    setQ("");
    setSearch("");
    void load(true, "");
  };

  const onCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createName.trim() || creating) return;

    setCreating(true);
    setCreateError("");
    setCreatedSummary(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          ownerEmail: createOwnerEmail.trim() || undefined,
          initialChannelName: createChannelName.trim() || undefined,
          initialChannelCategory: createChannelCategory,
          initialOriginHlsUrl: createOriginHlsUrl.trim() || undefined,
          createInitialStream,
          initialStreamTitle: createStreamTitle.trim() || undefined,
          provisionIngestKey: createProvisionIngest,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | CreateTenantResponse
        | { ok?: false; error?: string }
        | null;

      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setCreateError((json && "error" in json && json.error) || "Impossible de créer l’éditeur.");
        return;
      }

      setCreatedSummary(json);
      setCreateName("");
      setCreateOwnerEmail("");
      setCreateChannelName("");
      setCreateChannelCategory("Autre");
      setCreateOriginHlsUrl("");
      setCreateInitialStream(true);
      setCreateStreamTitle("");
      setCreateProvisionIngest(true);
      setOpenCreate(false);
      await load(true, search);
    } catch {
      setCreateError("Erreur réseau sur la création de l’éditeur.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Portefeuille éditeurs"
        subtitle="Provisionnement des organisations, bootstrap des premiers assets et niveau de mise en service par tenant."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Superadmin" },
          { label: "Éditeurs" },
        ]}
        icon={<Building2 className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void load(true, search)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              onClick={() => {
                setCreateError("");
                setOpenCreate(true);
              }}
            >
              <Plus className="size-4" />
              Nouvel éditeur
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Actifs" value={numberFormat(totals.active)} hint={`${numberFormat(items.length)} organisation(s)`} icon={<Building2 className="size-4" />} tone="success" loading={loading} />
        <KpiCard label="Onboarding" value={`${numberFormat(totals.ready)} / ${numberFormat(items.length)}`} hint={`${numberFormat(items.length - totals.origins)} source(s) à raccorder`} icon={<Shield className="size-4" />} tone={items.length - totals.origins > 0 ? "warning" : "info"} loading={loading} />
        <KpiCard label="Membres" value={numberFormat(totals.members)} hint={`${numberFormat(totals.channels)} chaîne(s)`} icon={<Users className="size-4" />} loading={loading} />
        <KpiCard label="Directs live" value={`${numberFormat(totals.liveStreams)} / ${numberFormat(totals.streams)}`} hint={`${numberFormat(totals.events24h)} événement(s) sur 24 h`} icon={<Activity className="size-4" />} tone="info" loading={loading} />
      </KpiRow>

      {loadError ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {loadError}
        </div>
      ) : null}

      {createdSummary ? (
        <Card className="border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,40,33,0.95),rgba(10,24,20,0.92))] text-emerald-50">
          <CardHeader>
            <div className="flex items-start gap-4">
              <span className="inline-flex size-12 items-center justify-center rounded-[20px] border border-emerald-300/18 bg-emerald-400/10">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <CardTitle className="text-emerald-50">{createdSummary.tenant.name}</CardTitle>
                <CardDescription className="mt-2 text-emerald-100/75">
                  Mise en service {createdSummary.onboarding.completion}/{createdSummary.onboarding.total_steps}. {formatMissingSteps(createdSummary.onboarding.missing_steps)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-emerald-300/12 bg-black/10 p-4 text-sm">{createdSummary.invited_owner?.email ?? "--"}</div>
            <div className="rounded-[20px] border border-emerald-300/12 bg-black/10 p-4 text-sm">{createdSummary.bootstrap.channel?.name ?? "--"}</div>
            <div className="rounded-[20px] border border-emerald-300/12 bg-black/10 p-4 text-sm">{createdSummary.bootstrap.stream?.title ?? "--"}</div>
            <div className="rounded-[20px] border border-emerald-300/12 bg-black/10 p-4 text-sm">{createdSummary.bootstrap.ingest_key ? "Ingest provisionné" : "--"}</div>
          </CardContent>
          {createdSummary.warnings.length > 0 ? (
            <CardContent className="pt-0">
              <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                {createdSummary.warnings.join(" ")}
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recherche portefeuille</CardTitle>
          <CardDescription>Filtrage serveur par nom d’éditeur pour isoler rapidement un compte ou un lot.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <form onSubmit={onSubmitSearch} className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Rechercher un éditeur" className="pl-11" />
            </div>
            <Button type="submit" variant="outline">Filtrer</Button>
            {search ? <Button type="button" variant="ghost" onClick={clearSearch}>Effacer</Button> : null}
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{numberFormat(items.length)} éditeur(s)</Badge>
            <Badge variant="outline">{numberFormat(totals.channels)} chaîne(s)</Badge>
            <Badge variant="outline">{numberFormat(totals.streams)} direct(s)</Badge>
          </div>
        </CardContent>
      </Card>

      <DataTableShell
        title="Portefeuille multi-éditeur"
        description="Lecture portefeuille, owner principal et niveau de mise en service par organisation."
        loading={loading}
        error={items.length === 0 ? loadError || undefined : undefined}
        onRetry={() => void load(true, search)}
        isEmpty={!loading && items.length === 0}
        emptyTitle={search ? "Aucun éditeur" : "Aucun éditeur provisionné"}
        emptyDescription={search ? "Aucun résultat ne correspond au filtre actuel." : "Aucun espace n’est encore disponible."}
        emptyAction={
          <Button
            onClick={() => {
              setCreateError("");
              setOpenCreate(true);
            }}
          >
            <Plus className="size-4" />
            Nouvel éditeur
          </Button>
        }
        footer={
          loadError && items.length === 0 ? null : (
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              {numberFormat(totals.members)} membres | {numberFormat(totals.liveStreams)} directs live | {numberFormat(totals.events24h)} événements 24 h
            </div>
          )
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Éditeur</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Mise en service</TableHead>
              <TableHead className="text-right">Membres</TableHead>
              <TableHead className="text-right">Chaînes</TableHead>
              <TableHead className="text-right">Directs</TableHead>
              <TableHead className="text-right">Événements 24 h</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Création</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((tenant) => (
              <TableRow key={tenant.id} className="align-top">
                <TableCell>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 font-medium text-white"><Building2 className="size-4 text-[var(--brand-primary)]" />{tenant.name}</div>
                    <div className="text-xs text-slate-500">{tenant.id.slice(0, 8)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{tenant.owner_email ?? "--"}</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{tenant.onboarding_completion}/{tenant.onboarding_total}</Badge>
                      {tenant.origin_configured ? <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-200">Source OK</Badge> : <Badge variant="outline">Source à raccorder</Badge>}
                      {tenant.ingest_configured ? <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">Ingest OK</Badge> : <Badge variant="outline">Ingest à provisionner</Badge>}
                    </div>
                    <p className="text-xs leading-5 text-slate-400">{formatMissingSteps(tenant.missing_steps)}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">{numberFormat(tenant.members_count)}</TableCell>
                <TableCell className="text-right">{numberFormat(tenant.channels_count)}</TableCell>
                <TableCell className="text-right">{numberFormat(tenant.live_streams_count)} / {numberFormat(tenant.streams_count)}</TableCell>
                <TableCell className="text-right">{numberFormat(tenant.events_24h)}</TableCell>
                <TableCell className="text-right"><TenantStatusBadge status={tenant.status} /></TableCell>
                <TableCell className="text-right text-slate-400">{dateTimeFormat(tenant.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <Dialog
        open={openCreate}
        onOpenChange={(nextOpen) => {
          setOpenCreate(nextOpen);
          if (!nextOpen) setCreateError("");
        }}
      >
        <DialogContent className="sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>Ouvrir un nouvel éditeur</DialogTitle>
            <DialogDescription>Création du tenant, du responsable principal et bootstrap optionnel des assets de diffusion.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateTenant} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nom de l’éditeur</Label>
                    <Input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Ex: Vision Africa Media" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsable principal</Label>
                    <Input type="email" value={createOwnerEmail} onChange={(event) => setCreateOwnerEmail(event.target.value)} placeholder="admin@editeur.com" />
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Première chaîne</Label>
                      <Input value={createChannelName} onChange={(event) => setCreateChannelName(event.target.value)} placeholder="Ex: Vision Africa TV" />
                    </div>
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select value={createChannelCategory} onValueChange={(value) => setCreateChannelCategory(value as (typeof CHANNEL_CATEGORIES)[number])}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                        <SelectContent>{CHANNEL_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Origine HLS initiale</Label>
                      <Input value={createOriginHlsUrl} onChange={(event) => setCreateOriginHlsUrl(event.target.value)} placeholder="https://origin.example.com/live/master.m3u8" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Titre du premier direct</Label>
                      <Input value={createStreamTitle} onChange={(event) => setCreateStreamTitle(event.target.value)} placeholder="Ex: Vision Africa Live" disabled={!createInitialStream} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
                    <div><Label className="text-sm text-white">Créer un premier direct</Label><p className="mt-1 text-xs text-slate-400">Flux initial rattaché à la première chaîne.</p></div>
                    <Switch checked={createInitialStream} onCheckedChange={setCreateInitialStream} />
                  </div>
                  <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
                    <div><Label className="text-sm text-white">Provisionner la clé ingest</Label><p className="mt-1 text-xs text-slate-400">Prépare analytics runtime et endpoints reliés.</p></div>
                    <Switch checked={createProvisionIngest} onCheckedChange={setCreateProvisionIngest} />
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Projection</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-[18px] border border-white/8 bg-black/10 p-3">{createName.trim() || "--"}</div>
                  <div className="rounded-[18px] border border-white/8 bg-black/10 p-3">{createOwnerEmail.trim() || "Responsable à affecter"}</div>
                  <div className="rounded-[18px] border border-white/8 bg-black/10 p-3">{createChannelName.trim() || createName.trim() || "--"}</div>
                  <div className="rounded-[18px] border border-white/8 bg-black/10 p-3">{createInitialStream ? "Direct initial" : "Sans direct"} | {createProvisionIngest ? "Ingest provisionné" : "Ingest différé"}</div>
                </div>
              </div>
            </div>
            {createError ? <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{createError}</div> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={!createName.trim() || creating}>{creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Créer l’éditeur</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
