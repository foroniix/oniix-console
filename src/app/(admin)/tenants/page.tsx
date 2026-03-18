"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  generated_at: string;
  total: number;
  tenants: TenantListItem[];
};

type CreateTenantResponse = {
  ok: true;
  tenant: {
    id: string;
    name: string;
    created_at: string | null;
    created_by: string | null;
  };
  invited_owner: {
    email: string | null;
    user_id: string | null;
  } | null;
  onboarding: {
    owner_configured: boolean;
    channel_configured: boolean;
    origin_configured: boolean;
    stream_configured: boolean;
    ingest_configured: boolean;
    completion: number;
    total_steps: number;
    missing_steps: OnboardingStep[];
    status: "ready" | "setup";
  };
  bootstrap: {
    channel: {
      id: string;
      name: string;
      slug: string | null;
      category: string | null;
      origin_hls_url: string | null;
    } | null;
    stream: {
      id: string;
      channel_id: string | null;
      title: string;
      status: string | null;
    } | null;
    ingest_key: string | null;
  };
  warnings: string[];
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

function formatMissingSteps(steps: OnboardingStep[]) {
  if (steps.length === 0) return "Onboarding complet";
  return `Manque: ${steps.map((step) => ONBOARDING_STEP_LABELS[step]).join(", ")}`;
}

function StatusBadge({ status }: { status: TenantStatus }) {
  if (status === "active") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
        Actif
      </Badge>
    );
  }

  if (status === "ready") {
    return (
      <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-300">
        Prêt
      </Badge>
    );
  }

  return <Badge variant="outline">À compléter</Badge>;
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
  const [createChannelName, setCreateChannelName] = useState("");
  const [createChannelCategory, setCreateChannelCategory] =
    useState<(typeof CHANNEL_CATEGORIES)[number]>("Autre");
  const [createOriginHlsUrl, setCreateOriginHlsUrl] = useState("");
  const [createInitialStream, setCreateInitialStream] = useState(true);
  const [createStreamTitle, setCreateStreamTitle] = useState("");
  const [createProvisionIngest, setCreateProvisionIngest] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<CreateTenantResponse | null>(null);

  const resetCreateForm = useCallback(() => {
    setCreateName("");
    setCreateOwnerEmail("");
    setCreateChannelName("");
    setCreateChannelCategory("Autre");
    setCreateOriginHlsUrl("");
    setCreateInitialStream(true);
    setCreateStreamTitle("");
    setCreateProvisionIngest(true);
  }, []);

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
        setError((json && "error" in json && json.error) || "Impossible de charger les éditeurs.");
        return;
      }
      setItems(json.tenants ?? []);
    } catch {
      setError("Erreur réseau sur la liste des éditeurs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false, "");
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
        setError((json && "error" in json && json.error) || "Impossible de créer l’éditeur.");
        return;
      }

      setCreatedSummary(json);
      resetCreateForm();
      setOpenCreate(false);
      await load(true, search);
    } catch {
      setError("Erreur réseau sur la création de l’éditeur.");
    } finally {
      setCreating(false);
    }
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.members += item.members_count;
        acc.channels += item.channels_count;
        acc.streams += item.streams_count;
        acc.liveStreams += item.live_streams_count;
        acc.events24h += item.events_24h;
        if (item.ingest_configured) acc.ingestConfigured += 1;
        if (item.status === "active") acc.active += 1;
        if (item.onboarding_completion >= item.onboarding_total) acc.ready += 1;
        return acc;
      },
      {
        active: 0,
        ready: 0,
        members: 0,
        channels: 0,
        streams: 0,
        liveStreams: 0,
        events24h: 0,
        ingestConfigured: 0,
      }
    );
  }, [items]);

  return (
    <div className="console-page">
      <header className="console-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">Éditeurs</h1>
            <Badge className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20">
              Portefeuille plateforme
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Gestion des organisations média, mise en service initiale et suivi du provisioning.
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
                Nouvel éditeur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>Créer un éditeur</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreateTenant} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200">Nom de l’éditeur</label>
                    <Input
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="Ex: Vision Africa Media"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200">Email administrateur principal</label>
                    <Input
                      type="email"
                      value={createOwnerEmail}
                      onChange={(event) => setCreateOwnerEmail(event.target.value)}
                      placeholder="admin@editeur.com"
                    />
                  </div>
                </div>

                <div className="console-panel-muted p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-slate-950 dark:text-white">Préconfiguration initiale</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Optionnel. Permet de livrer un espace déjà prêt pour la console et l&apos;application mobile.
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 dark:text-slate-200">Première chaîne</label>
                      <Input
                        value={createChannelName}
                        onChange={(event) => setCreateChannelName(event.target.value)}
                        placeholder="Ex: Vision Africa TV"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Si vide, le nom de l’éditeur sera réutilisé si un direct initial est demandé.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 dark:text-slate-200">Catégorie</label>
                      <Select
                        value={createChannelCategory}
                        onValueChange={(value) =>
                          setCreateChannelCategory(value as (typeof CHANNEL_CATEGORIES)[number])
                        }
                      >
                        <SelectTrigger className="console-field w-full">
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                          {CHANNEL_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm text-slate-700 dark:text-slate-200">Origine HLS initiale</label>
                      <Input
                        value={createOriginHlsUrl}
                        onChange={(event) => setCreateOriginHlsUrl(event.target.value)}
                        placeholder="https://origin.example.com/live/master.m3u8"
                      />
                    </div>

                    <label className="console-panel-muted flex items-start gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={createInitialStream}
                        onChange={(event) => setCreateInitialStream(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-slate-950 dark:text-white">
                          Créer un premier direct
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Génère un direct opérationnel relié à la première chaîne.
                        </span>
                      </span>
                    </label>

                    <label className="console-panel-muted flex items-start gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={createProvisionIngest}
                        onChange={(event) => setCreateProvisionIngest(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-slate-950 dark:text-white">
                          Provisionner une clé ingest
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Génère une clé serveur pour analytics et endpoints runtime player.
                        </span>
                      </span>
                    </label>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm text-slate-700 dark:text-slate-200">Titre du premier direct</label>
                      <Input
                        value={createStreamTitle}
                        onChange={(event) => setCreateStreamTitle(event.target.value)}
                        placeholder="Ex: Vision Africa Live"
                        disabled={!createInitialStream}
                      />
                    </div>
                  </div>
                </div>

                <div className="console-panel-muted p-3 text-xs text-slate-500 dark:text-slate-400">
                  Le backend crée d&apos;abord l&apos;éditeur, puis ajoute les éléments de préconfiguration en best
                  effort. Les étapes non critiques reviennent en avertissements sans annuler la création
                  de l&apos;espace.
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Créer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {createdSummary ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-300" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-emerald-100">
                  Éditeur créé : {createdSummary.tenant.name}
                </div>
                <div className="text-xs text-emerald-200/80">
                  Mise en service {createdSummary.onboarding.completion}/
                  {createdSummary.onboarding.total_steps}
                  {" - "}
                  {formatMissingSteps(createdSummary.onboarding.missing_steps)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-xs text-emerald-100/90 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-emerald-200/70">Administrateur</div>
                <div>{createdSummary.invited_owner?.email ?? "--"}</div>
              </div>
              <div>
                <div className="text-emerald-200/70">Chaîne</div>
                <div>{createdSummary.bootstrap.channel?.name ?? "--"}</div>
              </div>
              <div>
                <div className="text-emerald-200/70">Direct</div>
                <div>{createdSummary.bootstrap.stream?.title ?? "--"}</div>
              </div>
              <div>
                <div className="text-emerald-200/70">Ingest</div>
                <div>{createdSummary.bootstrap.ingest_key ? "Provisionnée" : "--"}</div>
              </div>
            </div>

            {createdSummary.bootstrap.ingest_key ? (
              <div className="rounded-xl border border-emerald-400/20 bg-black/20 p-3">
                <div className="mb-1 text-xs uppercase tracking-wide text-emerald-200/70">
                  Clé ingest
                </div>
                <code className="break-all text-xs text-emerald-100">
                  {createdSummary.bootstrap.ingest_key}
                </code>
              </div>
            ) : null}

            {createdSummary.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                {createdSummary.warnings.join(" ")}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Éditeurs actifs</CardDescription>
            <CardTitle>{numberFormat(totals.active)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Onboarding complet</CardDescription>
            <CardTitle>{numberFormat(totals.ready)}</CardTitle>
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
            <CardDescription>Chaînes</CardDescription>
            <CardTitle>{numberFormat(totals.channels)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Directs</CardDescription>
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
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Portefeuille multi-éditeur</CardTitle>
            <CardDescription>
              Recherche, supervision business et état de mise en service par organisation.
            </CardDescription>
          </div>
          <form onSubmit={onSubmitSearch} className="flex gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Rechercher un éditeur…"
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
              Chargement des éditeurs...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/80 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              Aucun éditeur trouvé.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Éditeur</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead>Mise en service</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Chaînes</TableHead>
                  <TableHead className="text-right">Directs</TableHead>
                  <TableHead className="text-right">Événements 24h</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                  <TableHead className="text-right">Création</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium text-slate-950 dark:text-white">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        {tenant.name}
                      </span>
                    </TableCell>
                    <TableCell>{tenant.owner_email ?? "--"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="inline-flex items-center gap-2">
                          <Badge variant="outline">
                            {tenant.onboarding_completion}/{tenant.onboarding_total}
                          </Badge>
                          {tenant.origin_configured ? (
                            <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-300">
                              Source OK
                            </Badge>
                          ) : null}
                          {tenant.ingest_configured ? (
                            <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                              Ingest OK
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {formatMissingSteps(tenant.missing_steps)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{numberFormat(tenant.members_count)}</TableCell>
                    <TableCell className="text-right">{numberFormat(tenant.channels_count)}</TableCell>
                    <TableCell className="text-right">
                      {numberFormat(tenant.live_streams_count)} / {numberFormat(tenant.streams_count)}
                    </TableCell>
                    <TableCell className="text-right">{numberFormat(tenant.events_24h)}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={tenant.status} />
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
          <div className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Sparkles className="size-4 text-primary" />
            Base de plateforme : mise en service rapide, supervision live et gouvernance par rôles.
          </div>
          <Button asChild variant="outline">
            <a href="/system">Voir la santé système</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
